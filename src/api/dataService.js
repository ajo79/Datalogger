/*
 * dataService.js
 *
 * This module handles all API interactions with the backend (AWS Lambda/Gateway).
 * It includes robust error handling, timeouts, and response normalization.
 *
 * Key Features:
 * - Fetch with AbortController for timeouts (15s).
 * - Safe JSON parsing to prevent crashes on malformed responses.
 * - Lambda Proxy response normalization (handling "body" string vs direct JSON).
 */

const API_URL = "https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com";
const DASHBOARD_PATH = "/prod"; // change only if your stage/path differs

/**
 * Fetches text content from a URL with a strictly enforced timeout.
 * @param {string} url - The endpoint URL
 * @returns {Promise<string>} - The raw text response
 */
async function fetchText(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safely parses JSON string without throwing errors.
 * @param {string} text - JSON string
 * @returns {object|null} - Parsed object or null if failed
 */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Normalizes response from AWS Lambda.
 * Lambda can return checks in two formats:
 * 1. Direct JSON object
 * 2. Proxy integration format: { statusCode: 200, body: "{\"key\":\"value\"}" }
 */
function normalizeLambdaResponse(parsed) {
  // Case A: Lambda proxy format -> parse the inner 'body' string
  if (parsed && typeof parsed === "object" && typeof parsed.body === "string") {
    const inner = safeJsonParse(parsed.body);
    return inner ?? {};
  }

  // Case B: direct JSON response
  return parsed ?? {};
}

/**
 * Main function to fetch dashboard data.
 * Returns normalized object containing IoTReadings and RealTimeDataMonitor.
 */
export async function fetchDashboardData() {
  const text = await fetchText(`${API_URL}${DASHBOARD_PATH}`);
  const outer = safeJsonParse(text);

  if (!outer) {
    throw new Error(`Response is not valid JSON. Raw: ${text.slice(0, 200)}`);
  }

  const json = normalizeLambdaResponse(outer);

  return {
    IoTReadings: Array.isArray(json?.IoTReadings) ? json.IoTReadings : [],
    RealTimeDataMonitor: Array.isArray(json?.RealTimeDataMonitor)
      ? json.RealTimeDataMonitor
      : [],
  };
}

/**
 * Helper to get only RealTimeDataMonitor array.
 * This is the primary data source for the HomeScreen cards.
 */
export async function fetchRealTimeDataMonitor() {
  const { RealTimeDataMonitor } = await fetchDashboardData();
  return RealTimeDataMonitor;
}
