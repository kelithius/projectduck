import { NextRequest, NextResponse } from "next/server";

// Simple memory storage, actual projects may require more persistent storage solutions
let currentProjectPath: string | null = null;

export async function GET() {
  return NextResponse.json({
    currentProject: currentProjectPath,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Project path is required",
        },
        { status: 400 },
      );
    }

    // Validate path format
    if (typeof projectPath !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid project path format",
        },
        { status: 400 },
      );
    }

    // Update current project path
    currentProjectPath = projectPath;

    return NextResponse.json({
      success: true,
      projectPath: currentProjectPath,
    });
  } catch (error) {
    console.error("Project setting error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to set project path",
      },
      { status: 500 },
    );
  }
}
