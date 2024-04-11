export async function getStream(
  stream: NodeJS.ReadableStream,
): Promise<string> {
  let chunks = new Array<Buffer>();
  stream.on("data", (chunk) => {
    chunks.push(chunk);
  });
  return new Promise<string>((resolve, reject) => {
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString());
    });
    stream.on("error", (e) => {
      reject(e);
    });
  });
}
