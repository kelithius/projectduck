import { NextRequest } from 'next/server';
import { claudeSDKService } from '@/lib/services/claude/claudeSDKService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const message = formData.get('message') as string;
    const projectPath = formData.get('projectPath') as string;
    const claudeSessionId = formData.get('clientSessionId') as string; // 向後相容：前端還用 clientSessionId
    
    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!projectPath?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project path is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 處理附件
    const attachmentCount = parseInt(formData.get('attachmentCount') as string || '0');
    const attachments: File[] = [];
    
    for (let i = 0; i < attachmentCount; i++) {
      const file = formData.get(`attachment_${i}`) as File;
      if (file) {
        attachments.push(file);
      }
    }

    console.log('[Query API] Processing request:', {
      claudeSessionId: claudeSessionId || 'new-session', 
      projectPath,
      messageLength: message.length,
      attachmentCount: attachments.length
    });

    // 啟動查詢
    const result = await claudeSDKService.startQuery({
      prompt: message,
      projectPath,
      claudeSessionId: claudeSessionId || undefined, // 如果沒有則為新 session
      attachments: attachments.length > 0 ? attachments : undefined
    });

    if (!result.success || !result.queryGenerator) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Failed to start query' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 設定 SSE headers
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 建立 SSE 串流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let actualSessionId = claudeSessionId || 'new-session';
        
        try {
          // 發送開始事件
          controller.enqueue(encoder.encode(
            `event: start\ndata: ${JSON.stringify({ 
              message: 'Query started',
              claudeSessionId: actualSessionId 
            })}\n\n`
          ));

          // 處理 SDK 訊息
          if (result.queryGenerator) {
            for await (const sdkMessage of claudeSDKService.processQuery(
              result.queryGenerator, 
              claudeSessionId,
              (sessionId: string) => {
                // 當獲得真實的 Claude session ID 時，更新並報告給前端
                actualSessionId = sessionId;
                console.log('[Query API] Received Claude session ID:', sessionId);
                
                // 發送 session ID 事件給前端
                controller.enqueue(encoder.encode(
                  `event: session\ndata: ${JSON.stringify({ 
                    claudeSessionId: sessionId 
                  })}\n\n`
                ));
              }
            )) {
            // 轉換 SDK 訊息為前端格式
            const eventData = {
              type: sdkMessage.type,
              data: sdkMessage
            };

            controller.enqueue(encoder.encode(
              `event: message\ndata: ${JSON.stringify(eventData)}\n\n`
            ));
            }
          }

          // 發送完成事件
          controller.enqueue(encoder.encode(
            `event: complete\ndata: ${JSON.stringify({ 
              message: 'Query completed successfully' 
            })}\n\n`
          ));

        } catch (error) {
          console.error('[Query API] Stream error:', error);
          
          // 發送錯誤事件
          controller.enqueue(encoder.encode(
            `event: error\ndata: ${JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`
          ));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers });

  } catch (error) {
    console.error('[Query API] Request error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 中斷查詢
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const claudeSessionId = searchParams.get('clientSessionId'); // 向後相容：前端還用 clientSessionId
    
    if (!claudeSessionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Claude session ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const success = await claudeSDKService.interruptQuery(claudeSessionId);
    
    return new Response(
      JSON.stringify({ 
        success,
        message: success ? 'Query interrupted' : 'Query not found or already completed'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Query API] Interrupt error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to interrupt query'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}