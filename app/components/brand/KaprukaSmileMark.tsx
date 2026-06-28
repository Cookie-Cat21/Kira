/** Kapruka smile arc — brand mark from logo geometry */
export default function KaprukaSmileMark({
  className = "h-auto w-28",
  testId,
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <svg
      viewBox="326 40 114 58"
      className={className}
      data-testid={testId}
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        className="text-kap-yellow"
        d="M402.986267,67.193703 C411.020386,61.704575 416.238495,54.617882 418.415070,45.324123 C424.890198,45.324123 431.318146,45.324123 437.750275,45.324123 C437.129608,66.508202 416.547272,90.716156 386.719543,92.762413 C356.255249,94.852348 331.226654,71.531693 328.261810,45.118824 C334.079407,45.118824 339.857269,44.962524 345.612488,45.253811 C346.731842,45.310467 348.364868,46.921478 348.743073,48.133221 C353.218384,62.471653 368.281891,74.652725 385.670837,72.854988 C391.454773,72.257019 396.988068,69.234306 402.986267,67.193703 z"
        style={{ filter: "drop-shadow(0 0 20px rgba(248,218,8,0.35))" }}
      />
    </svg>
  );
}
