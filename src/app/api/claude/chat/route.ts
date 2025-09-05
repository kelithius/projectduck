import { NextRequest } from 'next/server';
import { claudeSDKService } from '@/lib/services/claude/claudeSDKService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const projectPath = formData.get('projectPath') as string;
    const browserSessionId = formData.get('browserSessionId') as string;
    const attachmentCount = parseInt(formData.get('attachmentCount') as string || '0');

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
    const attachments: File[] = [];
    for (let i = 0; i < attachmentCount; i++) {
      const file = formData.get(`attachment_${i}`) as File;
      if (file) {
        attachments.push(file);
      }
    }

    // 建立 Server-Sent Events 串流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // 監聽請求取消信號
        const abortHandler = () => {
          console.log('Request aborted by client');
          // 發送取消事件而不是錯誤事件
          try {
            sendEvent('complete', { 
              message: 'Request cancelled by user',
              cancelled: true 
            });
          } catch {
            // 如果無法發送事件（連接已關閉），直接忽略
          }
          claudeSDKService.interruptQuery(projectPath, browserSessionId);
          controller.close();
        };
        
        request.signal?.addEventListener('abort', abortHandler);
        
        const sendEvent = (eventType: string, data: unknown) => {
          const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // 發送開始事件
          sendEvent('start', { 
            message: 'Starting Claude Code query...',
            projectPath,
            attachmentCount: attachments.length
          });

          // 啟動查詢
          const queryResult = await claudeSDKService.startQuery({
            prompt: message,
            projectPath,
            browserSessionId,
            attachments,
            permissionMode: 'default',
            allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
            maxTurns: 50
          });

          if (!queryResult.success) {
            const error = queryResult.error || 'Failed to start query';
            console.error('Query start failed:', error);
            sendEvent('error', { 
              error: error
            });
            controller.close();
            return;
          }

          // 處理串流回應
          try {
            for await (const sdkMessage of claudeSDKService.processQuery(queryResult.sessionId)) {
              sendEvent('message', {
                type: sdkMessage.type,
                data: sdkMessage
              });
            }

            // 發送完成事件
            sendEvent('complete', { 
              message: 'Query completed successfully',
              sessionId: queryResult.sessionId
            });

          } catch (queryError) {
            console.error('Query processing error:', queryError);
            sendEvent('error', { 
              error: queryError instanceof Error ? queryError.message : 'Query processing failed'
            });
          }

        } catch (error) {
          console.error('Stream error:', error);
          sendEvent('error', { 
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        } finally {
          request.signal?.removeEventListener('abort', abortHandler);
          controller.close();
        }
      },

      cancel() {
        console.log('Stream cancelled');
        // 嘗試中斷查詢
        claudeSDKService.interruptQuery(projectPath, browserSessionId);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 新增中斷查詢的 API 端點
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const browserSessionId = searchParams.get('browserSessionId');

    if (!projectPath) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project path is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const success = await claudeSDKService.interruptQuery(projectPath, browserSessionId || undefined);
    
    return new Response(
      JSON.stringify({ 
        success,
        message: success ? 'Query interrupted successfully' : 'No active query to interrupt'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Interrupt API error:', error);
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