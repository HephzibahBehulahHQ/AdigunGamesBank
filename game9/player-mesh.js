const attributes = {
  positions: Float32Array,
  skinUvs: Float32Array,
  skinIndices: Uint16Array,
  skinWeights: Float32Array,
};

function align4(offset) {
  return Math.ceil(offset / 4) * 4;
}

export function packPlayerMesh(data) {
  const lengths = Object.keys(attributes).map(name => data[name].length);
  const { normalSeams, sections, rig } = data;
  const metadata = new TextEncoder().encode(JSON.stringify({ lengths, normalSeams, sections, rig }));
  let size = align4(4 + metadata.length);
  for (const [name, Type] of Object.entries(attributes)) {
    size = align4(size + data[name].length * Type.BYTES_PER_ELEMENT);
  }
  const output = new ArrayBuffer(size);
  new DataView(output).setUint32(0, metadata.length, true);
  new Uint8Array(output, 4, metadata.length).set(metadata);
  let offset = align4(4 + metadata.length);
  for (const [name, Type] of Object.entries(attributes)) {
    const values = new Type(output, offset, data[name].length);
    values.set(data[name]);
    offset = align4(offset + values.byteLength);
  }
  return new Uint8Array(output);
}

export function readPlayerMesh(buffer) {
  const metadataLength = new DataView(buffer).getUint32(0, true);
  const metadata = new Uint8Array(buffer, 4, metadataLength);
  const { lengths, ...data } = JSON.parse(new TextDecoder().decode(metadata));
  let offset = align4(4 + metadataLength);
  for (const [index, [name, Type]] of Object.entries(attributes).entries()) {
    const values = new Type(buffer, offset, lengths[index]);
    data[name] = values;
    offset = align4(offset + values.byteLength);
  }
  return data;
}
