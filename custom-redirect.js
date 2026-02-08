import errorTemplate from './html/error-template.html'
import { HELPER } from './helper-functions.js'

/**
 * Generates the error page HTML with the given details
 * @param {Object} details - Error details to inject into the template
 * @returns {string} The HTML with injected values
 */
function generateErrorPage(details) {
  return errorTemplate
    .replace('ERROR_CODE', details.errorCode)
    .replace('ERROR_TYPE', details.errorType)
    .replace('ERROR_MESSAGE', details.errorMessage)
    .replace('ERROR_GIF', details.errorGif)
    .replace('ENABLE_REPORT_ERROR', details.enableReportError)
    .replace('REPORT_ERROR_BUTTON_TEXT', details.reportErrorButtonText)
    .replace('REPORT_ERROR_MODAL_HEADER_TEXT', details.reportErrorModalHeaderText)
    .replace('REPORT_ERROR_LABEL_PLACEHOLDER', details.reportErrorLabelPlaceholder)
    .replace('REPORT_ERROR_MODAL_NAME_PLACEHOLDER', details.reportErrorModalNamePlaceholder)
    .replace('REPORT_ERROR_CANCEL_BUTTON_TEXT', details.reportErrorCancelButtonText)
    .replace('REPORT_ERROR_SUBMIT_BUTTON_TEXT', details.reportErrorSubmitButtonText)
    .replace('REPORT_ERROR_SUCCESS_MESSAGE', details.reportErrorSuccessMessage)
    .replace('REPORT_ERROR_FAILURE_MESSAGE', details.reportErrorFailureMessage)
    .replace('REPORT_ERROR_CODE', details.errorCode);
}

/**
 * Creates an HTTP response with specified content
 * @param {string} content - HTML content for the response
 * @param {string} statusCode - HTTP status code
 * @returns {Response} The formatted response
 */
function makeResponse(content, statusCode) {
  return new Response(content, {
    status: parseInt(statusCode, 10),
    headers: {
      'Content-Type': 'text/html',
      'X-Worker-Handled': 'true'
    }
  });
}

/**
 * Builds error details object from an error code and env config
 * @param {number|string} cfCode - The error code or "MAINTENANCE"
 * @param {Object} env - Environment variables
 * @returns {Object} Error details for the template
 */
function getErrorDetails(cfCode, env) {
  const details = {
    errorCode: "500",
    errorType: env.TEXT_GENERIC_ERROR_TYPE,
    errorMessage: env.TEXT_GENERIC_ERROR_MESSAGE,
    errorGif: env.TEXT_GENERIC_ERROR_GIF,
    enableReportError: false,
    reportErrorButtonText: '',
    reportErrorModalHeaderText: '',
    reportErrorLabelPlaceholder: '',
    reportErrorModalNamePlaceholder: '',
    reportErrorCancelButtonText: '',
    reportErrorSubmitButtonText: '',
    reportErrorSuccessMessage: '',
    reportErrorFailureMessage: ''
  };

  if (cfCode === "MAINTENANCE") {
    details.errorCode = "503";
    details.errorType = env.TEXT_MAINTENANCE_TYPE;
    details.errorMessage = env.TEXT_MAINTENANCE_MESSAGE;
    details.errorGif = env.TEXT_MAINTENANCE_GIF;
    return details;
  }

  details.errorCode = cfCode ? cfCode.toString() : "500";
  console.log(`Handling error with code: ${details.errorCode}`);

  const enableReport = env.ENABLE_REPORT_ERROR === true || env.ENABLE_REPORT_ERROR === 'true';
  details.enableReportError = enableReport;
  if (enableReport) {
    details.reportErrorButtonText = env.REPORT_ERROR_BUTTON_TEXT;
    details.reportErrorModalHeaderText = env.REPORT_ERROR_MODAL_HEADER_TEXT;
    details.reportErrorLabelPlaceholder = env.REPORT_ERROR_LABEL_PLACEHOLDER;
    details.reportErrorModalNamePlaceholder = env.REPORT_ERROR_MODAL_NAME_PLACEHOLDER;
    details.reportErrorCancelButtonText = env.REPORT_ERROR_CANCEL_BUTTON_TEXT;
    details.reportErrorSubmitButtonText = env.REPORT_ERROR_SUBMIT_BUTTON_TEXT;
    details.reportErrorSuccessMessage = env.REPORT_ERROR_SUCCESS_MESSAGE;
    details.reportErrorFailureMessage = env.REPORT_ERROR_FAILURE_MESSAGE;
  }

  const containerCodes = env.TEXT_CONTAINER_ERROR_CODE || [];
  const boxCodes = env.TEXT_BOX_ERROR_CODE || [];
  const tunnelCodes = env.TEXT_TUNNEL_ERROR_CODE || [];

  if (containerCodes.includes(cfCode)) {
    details.errorType = env.TEXT_CONTAINER_ERROR_TYPE;
    details.errorMessage = env.TEXT_CONTAINER_ERROR_MESSAGE;
    details.errorGif = env.TEXT_CONTAINER_ERROR_GIF;
  } else if (boxCodes.includes(cfCode)) {
    details.errorType = env.TEXT_BOX_ERROR_TYPE;
    details.errorMessage = env.TEXT_BOX_ERROR_MESSAGE;
    details.errorGif = env.TEXT_BOX_ERROR_GIF;
  } else if (tunnelCodes.includes(cfCode)) {
    details.errorType = env.TEXT_TUNNEL_ERROR_TYPE;
    details.errorMessage = env.TEXT_TUNNEL_ERROR_MESSAGE;
    details.errorGif = env.TEXT_TUNNEL_ERROR_GIF;
  }

  return details;
}

/**
 * Check if a host matches any pattern in a list (supports *.domain.fr wildcards)
 * @param {string} host - The hostname to check
 * @param {Array<string>} patterns - Array of patterns to match against
 * @returns {boolean} True if the host matches any pattern
 */
function hostMatchesAny(host, patterns) {
  if (!host || !Array.isArray(patterns)) return false;
  return patterns.some(pattern => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // ".domain.fr"
      return host.endsWith(suffix) && host !== pattern.slice(2);
    }
    return host === pattern;
  });
}

/**
 * Try to fetch cached version from Cloudflare Always Online
 * @param {Request} request - Incoming request
 * @returns {Promise<Response|null>} Cached response or null
 */
async function tryFetchAlwaysOnlineCache(request) {
  try {
    // Try to fetch from Cloudflare cache with special options
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    
    // Try to get cached response
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      // Clone the response and add a header to indicate it's from cache
      const newResponse = new Response(cachedResponse.body, cachedResponse);
      const headers = new Headers(newResponse.headers);
      headers.set('X-Served-From-Cache', 'cloudflare-always-online');
      headers.set('X-Worker-Handled', 'true');
      
      return new Response(newResponse.body, {
        status: 200,
        statusText: 'OK',
        headers: headers
      });
    }
  } catch (err) {
    console.error('Always Online cache fetch failed:', err);
  }
  
  return null;
}

/**
 * Main redirection and error handling function
 * @param {Request} request - Incoming request
 * @param {Response|null} response - Server response if available
 * @param {Error|null} thrownError - Thrown error if present
 * @param {boolean} isMaintenance - Maintenance mode state
 * @param {Object} env - Environment variables
 * @returns {Promise<Response|null>} Appropriate error response or null
 */
export async function c_redirect(request, response, thrownError, isMaintenance, env) {
  const host = request.headers.get('host');
  const alwaysOnlineDomains = env.ALWAYS_ONLINE_DOMAINS || [];
  const useAlwaysOnline = hostMatchesAny(host, alwaysOnlineDomains);
  // Maintenance mode
  if (isMaintenance) {
    const details = getErrorDetails("MAINTENANCE", env);
    return makeResponse(generateErrorPage(details), details.errorCode);
  }

  // Check if origin is reachable (only if ORIGIN_PING_URL is configured)
  const originUp = await HELPER.isOriginReachable(undefined, env).catch(() => null);

  // Origin confirmed down (originUp === false means the check ran and failed)
  // originUp === null means ORIGIN_PING_URL is not configured, so we skip this check
  if (originUp === false) {
    const details = getErrorDetails(504, env);
    return makeResponse(generateErrorPage(details), details.errorCode);
  }

  // Handle server errors (5xx) from the response
  if (response && response.status >= 500) {
    // Try Always Online cache if enabled for this domain
    if (useAlwaysOnline) {
      const cachedResponse = await tryFetchAlwaysOnlineCache(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    const details = getErrorDetails(response.status, env);
    return makeResponse(generateErrorPage(details), details.errorCode);
  }

  // Handle thrown errors (fetch failed entirely, e.g. container down / connection refused)
  if (thrownError && !response) {
    // Try Always Online cache if enabled for this domain
    if (useAlwaysOnline) {
      const cachedResponse = await tryFetchAlwaysOnlineCache(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    const details = getErrorDetails(502, env);
    return makeResponse(generateErrorPage(details), details.errorCode);
  }

  return null;
}
