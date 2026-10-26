// `import tone from "…/scan-ok.wav"`: Metro bundles the file as an asset and the import is its asset
// id, which expo-audio takes as a source. (Jest's asset transformer turns it into `1`.)
declare module "*.wav" {
  const assetId: number;
  export default assetId;
}
