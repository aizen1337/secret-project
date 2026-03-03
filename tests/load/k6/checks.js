import { check } from "k6";

export function checkOk(response, label) {
  return check(response, {
    [`${label} status 200`]: (r) => r.status === 200,
    [`${label} valid json`]: (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (error) {
        return false;
      }
    },
  });
}

export function parseJson(response) {
  try {
    return JSON.parse(response.body);
  } catch (error) {
    return null;
  }
}
