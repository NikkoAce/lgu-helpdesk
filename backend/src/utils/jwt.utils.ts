import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

const PRIVATE_KEY = process.env.PORTAL_PRIVATE_KEY ? process.env.PORTAL_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
const PUBLIC_KEY = process.env.PORTAL_PUBLIC_KEY ? process.env.PORTAL_PUBLIC_KEY.replace(/\\n/g, '\n') : '';
const ISSUER = process.env.PORTAL_ISSUER || 'lgu-daet-identity';
const KEY_ID = process.env.PORTAL_KEY_ID || 'portal-key-1';

if (!PRIVATE_KEY || !PUBLIC_KEY) {
    console.warn('WARNING: PORTAL_PRIVATE_KEY or PORTAL_PUBLIC_KEY is not defined. RS256 tokens will fail to generate.');
}

export const generateRS256Token = (payload: any, audience: string, expiresIn = '1h'): string => {
    if (!PRIVATE_KEY) {
        throw new Error('Cannot generate RS256 token without PORTAL_PRIVATE_KEY');
    }

    const options: SignOptions = {
        algorithm: 'RS256',
        expiresIn,
        issuer: ISSUER,
        audience,
        keyid: KEY_ID
    };

    return jwt.sign(payload, PRIVATE_KEY, options);
};

export const getJwks = () => {
    if (!PUBLIC_KEY) return { keys: [] };

    // Basic public key to JWK derivation (in production you might use a library like node-jose)
    // Here we'll return a simplified format or use crypto to extract modulus
    const key = crypto.createPublicKey(PUBLIC_KEY);
    const jwk = key.export({ format: 'jwk' });

    return {
        keys: [
            {
                ...jwk,
                kid: KEY_ID,
                use: 'sig',
                alg: 'RS256'
            }
        ]
    };
};
