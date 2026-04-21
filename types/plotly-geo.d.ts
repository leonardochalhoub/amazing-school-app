// Minimal ambient declaration — the geo-only plotly bundle doesn't
// ship types, and we access it through react-plotly.js's factory,
// which already types the component at the call site. An `any`
// default is fine here; callers cast to the concrete component type.
declare module "plotly.js-geo-dist-min" {
  const Plotly: unknown;
  export default Plotly;
}
