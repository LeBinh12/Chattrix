export function base64URLEncode(str: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(str)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export async function sha256(plain: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return await crypto.subtle.digest("SHA-256", data);
}

export async function generatePKCECodes() {
    const codeVerifier = crypto.randomUUID().replace(/-/g, "");
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64URLEncode(hashed);
    return { codeVerifier, codeChallenge };
}
