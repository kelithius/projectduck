"use client";

import { useLayoutEffect } from "react";

export const WarningSupressor = () => {
  useLayoutEffect(() => {
    // Intercept all possible warning output methods as early as possible
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;

    // Intercept console.warn
    console.warn = function (message, ...args) {
      if (
        typeof message === "string" &&
        message.includes("antd v5 support React is 16 ~ 18")
      ) {
        return;
      }
      originalWarn.apply(console, [message, ...args]);
    };

    // Intercept console.error
    console.error = function (message, ...args) {
      if (
        typeof message === "string" &&
        message.includes("antd v5 support React is 16 ~ 18")
      ) {
        return;
      }
      originalError.apply(console, [message, ...args]);
    };

    // Intercept console.log (just in case)
    console.log = function (message, ...args) {
      if (
        typeof message === "string" &&
        message.includes("antd v5 support React is 16 ~ 18")
      ) {
        return;
      }
      originalLog.apply(console, [message, ...args]);
    };

    // Attempt to directly modify React version check
    try {
      // Check if React version information exists and attempt to modify
      if (
        window &&
        (window as Window & { React?: { version: string } }).React?.version
      ) {
        Object.defineProperty(
          (window as Window & { React: { version: string } }).React,
          "version",
          {
            value: "18.3.1",
            writable: false,
            configurable: false,
          },
        );
      }
    } catch {
      // Ignore errors
    }

    // Cleanup function
    return () => {
      console.warn = originalWarn;
      console.error = originalError;
      console.log = originalLog;
    };
  }, []);

  return null;
};
