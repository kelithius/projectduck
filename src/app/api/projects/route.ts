import { NextResponse } from "next/server";
import { ProjectsResponse, ApiError } from "@/lib/types";
import projectConfigCache from "@/lib/services/projectConfigCache";

export async function GET() {
  try {
    // Read project configuration from memory cache
    const config = projectConfigCache.getProjectsFromCache();

    const response: ProjectsResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error loading projects configuration from cache:", error);

    // Return appropriate status code based on error type
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";

    if (error instanceof Error) {
      if (error.message.includes("configuration file not found")) {
        statusCode = 404;
        errorCode = "CONFIG_NOT_FOUND";
      } else if (error.message.includes("Invalid JSON format")) {
        statusCode = 400;
        errorCode = "INVALID_JSON";
      } else if (error.message.includes("Invalid configuration format")) {
        statusCode = 400;
        errorCode = "INVALID_CONFIG";
      }
    }

    const errorResponse: ApiError = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while loading projects",
      code: errorCode,
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
