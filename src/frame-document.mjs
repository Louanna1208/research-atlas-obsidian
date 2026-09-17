export function frameDocument(frame,token) {
  if(!/^[a-zA-Z0-9-]+$/.test(token))throw new Error('Invalid frame token');
  const nonce=token.replaceAll('-','');
  const script=`globalThis.__atlasToken=${JSON.stringify(token)};\n${frame.script}`.replace(/<\/script/gi,'<\\/script');
  const csp=`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; form-action 'none';`;
  return frame.html.replace('<head>',()=>`<head><meta http-equiv="Content-Security-Policy" content="${csp}">`).replace('</body>',()=>`<script type="module" nonce="${nonce}">${script}</script></body>`);
}
