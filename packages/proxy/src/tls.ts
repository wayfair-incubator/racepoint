import forge from 'node-forge';
import oh from 'object-hash';

const {
  pki,
  md,
  util: {encode64},
} = forge;

export type PEM = string | string[] | Buffer | Buffer[];

export async function generateCACertificate() {
  const options = {
    commonName: 'RacePoint Testing CA - DO NOT TRUST - TESTING ONLY',
    bits: 2048,
  };

  const keyPair = await new Promise<forge.pki.rsa.KeyPair>(
    (resolve, reject) => {
      pki.rsa.generateKeyPair({bits: options.bits}, (error, keyPair) => {
        if (error) reject(error);
        else resolve(keyPair);
      });
    }
  );

  const cert = pki.createCertificate();
  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = '1234567'; //todo: use a uuid?

  cert.validity.notBefore = new Date();
  // Make it valid for the last 24h - helps in cases where clocks slightly disagree
  cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1);

  cert.validity.notAfter = new Date();
  // Valid for the next year by default.
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

  cert.setSubject([{name: 'commonName', value: options.commonName}]);

  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
    },
  ]);

  // Self-issued too
  cert.setIssuer(cert.subject.attributes);

  // Self-sign the certificate - we're the root
  cert.sign(keyPair.privateKey, md.sha256.create());

  return {
    key: pki.privateKeyToPem(keyPair.privateKey),
    cert: pki.certificateToPem(cert),
  };
}

export function generateSPKIFingerprint(certPem: PEM) {
  let cert = pki.certificateFromPem(certPem.toString('utf8'));
  return encode64(
    pki.getPublicKeyFingerprint(cert.publicKey, {
      type: 'SubjectPublicKeyInfo',
      md: md.sha256.create(),
      encoding: 'binary',
    })
  );
}

export function testImport() {
  return oh.MD5.toString;
}
