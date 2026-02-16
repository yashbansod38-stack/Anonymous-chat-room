
// scripts/verify-e2ee.ts
// Verification of E2EE crypto logic using Node.js WebCrypto

import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';

// Polyfill window.crypto
if (typeof window === 'undefined') {
    (global as any).window = {
        crypto: webcrypto,
        btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
        atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
    };
    (global as any).TextEncoder = TextEncoder;
    (global as any).TextDecoder = TextDecoder;
}

// Mocking the imported functions since we can't easily import from src/lib in ts-node without mapping
// So we will copy the core logic here for verification of the ALGORITHM.

async function generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );
    const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    return { publicKey, privateKey };
}

async function importPublicKey(jwk: any) {
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );
}

async function importPrivateKey(jwk: any) {
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );
}

async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey) {
    return window.crypto.subtle.deriveKey(
        { name: "ECDH", public: publicKey },
        privateKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function encryptMessage(text: string, key: CryptoKey) {
    const encoded = new TextEncoder().encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );
    return {
        iv: Buffer.from(iv).toString('base64'),
        ciphertext: Buffer.from(encrypted).toString('base64')
    };
}

async function decryptMessage(ivBase64: string, ciphertextBase64: string, key: CryptoKey) {
    const iv = Buffer.from(ivBase64, 'base64');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        ciphertext
    );
    return new TextDecoder().decode(decrypted);
}

async function testE2EE() {
    console.log("=== Starting E2EE Verification ===");

    // 1. Generate User A Keys
    console.log("Generating User A Keys...");
    const userA = await generateKeyPair();
    console.log("User A Public JWK:", JSON.stringify(userA.publicKey).slice(0, 50) + "...");

    // 2. Generate User B Keys
    console.log("Generating User B Keys...");
    const userB = await generateKeyPair();
    console.log("User B Public JWK:", JSON.stringify(userB.publicKey).slice(0, 50) + "...");

    // 3. User A wants to send to User B
    console.log("\n--- A sending to B ---");
    const privA = await importPrivateKey(userA.privateKey);
    const pubB = await importPublicKey(userB.publicKey);

    // Derive Shared Key A->B
    const sharedA = await deriveSharedKey(privA, pubB);

    const originalText = "Hello, this is a secret message! 🔒";
    console.log("Original Text:", originalText);

    const encrypted = await encryptMessage(originalText, sharedA);
    console.log("Encrypted:", encrypted);

    // 4. User B receives
    console.log("\n--- B receiving from A ---");
    const privB = await importPrivateKey(userB.privateKey);
    const pubA = await importPublicKey(userA.publicKey);

    // Derive Shared Key B->A
    const sharedB = await deriveSharedKey(privB, pubA);

    // Validating Shared Keys match (cannot export CryptoKey directly easily to compare, but their function should match)

    const decrypted = await decryptMessage(encrypted.iv, encrypted.ciphertext, sharedB);
    console.log("Decrypted Text:", decrypted);

    if (decrypted === originalText) {
        console.log("\n✅ SUCCESS: Message decrypted correctly!");
    } else {
        console.error("\n❌ FAILED: Decryption mismatch.");
        process.exit(1);
    }
}

testE2EE().catch(e => {
    console.error(e);
    process.exit(1);
});
