import http from "k6/http";

const BASE_URL = (__ENV.CONVEX_BASE_URL || "http://127.0.0.1:3210").replace(/\/+$/, "");

function request(path, args, token, kind) {
  const route = kind === "action" ? "/api/action" : kind === "mutation" ? "/api/mutation" : "/api/query";
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = http.post(
    `${BASE_URL}${route}`,
    JSON.stringify({
      path,
      args: args || {},
      format: "convex_encoded_json",
    }),
    { headers },
  );
  return response;
}

export function convexQuery(path, args, token) {
  return request(path, args, token, "query");
}

export function convexMutation(path, args, token) {
  return request(path, args, token, "mutation");
}

export function convexAction(path, args, token) {
  return request(path, args, token, "action");
}
