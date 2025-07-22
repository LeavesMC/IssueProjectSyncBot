import env from "./env";

let encoder = new TextEncoder();

export async function verify(sigHex: string, payload: string) {
    let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

    let keyBytes = encoder.encode(env.webhookSecret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        extractable,
        [ "sign", "verify" ],
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    return await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes,
    );
}

function hexToBytes(hex: string) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
        let c = hex.slice(i, i + 2);
        bytes[index] = parseInt(c, 16);
        index += 1;
    }

    return bytes;
}