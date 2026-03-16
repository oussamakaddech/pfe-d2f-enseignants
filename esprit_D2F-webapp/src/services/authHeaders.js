export function getAuthToken() {
  return localStorage.getItem("authToken");
}

export function requireAuthToken() {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication token is missing.");
  }
  return token;
}

export function optionalAuthHeader() {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

export function requireAuthHeader() {
  return { Authorization: `Bearer ${requireAuthToken()}` };
}
