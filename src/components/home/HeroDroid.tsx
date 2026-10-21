/**
 * The astromech droids either side of the /tools hero, ported from CrewLabs'
 * FeatureDroid and recoloured to this site's black and white: white painted
 * panels, black accents, steel in neutral greys, and white as the only "lit"
 * colour (lenses, status lights, consoles), so a light reads as a light on
 * either theme. The floor glow and beams use var(--ink), so they
 * flip with the theme while the droid itself stays a white robot.
 *
 * Two variants, both about tools:
 *   fixer      a manipulator arm with a wrench that tightens on a loop, an
 *              antenna on the dome, and the scanning logic display.
 *   converter  a gear turning on its shoulder and a console that converts one
 *              file into another, the progress bar filling as it goes.
 *
 * The rig is all CSS keyframes (.hero-droid in globals.css), no JS. Ids are
 * prefixed with the variant so both droids can sit on one page.
 */

type DroidVariant = "fixer" | "converter";

/** Dome indicator lights, as `[x, delay]`. Staggered so the row chatters. */
const DOME_LIGHTS: Array<[number, string]> = [[100, "0s"], [110, "0.35s"], [120, "0.7s"], [190, "0.2s"], [200, "0.55s"], [210, "0.9s"]];

/** Logic-display cells: one lit cell walks left to right like a cursor. */
const LOGIC_CELLS: Array<[number, string]> = [[122, "0s"], [140, "0.12s"], [158, "0.24s"], [176, "0.36s"], [194, "0.48s"]];

/** Gear teeth, as angles round the hub. */
const TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

const OUTLINE = { stroke: "#0a0a0a", strokeWidth: 1.4 } as const;

export function HeroDroid({ variant, className = "" }: { variant: DroidVariant; className?: string }) {
  const id = (name: string) => `${variant}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg viewBox="0 0 320 470" aria-hidden="true" focusable="false" className={`hero-droid hero-droid-${variant} ${className}`.trim()}>
      <defs>
        <linearGradient id={id("paint")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#ececec" />
          <stop offset="100%" stopColor="#b4b4b4" />
        </linearGradient>
        <linearGradient id={id("dome")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#dcdcdc" />
          <stop offset="100%" stopColor="#7d7d7d" />
        </linearGradient>
        <linearGradient id={id("accent")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="55%" stopColor="#171717" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id={id("steel")} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#b4b4b4" />
          <stop offset="45%" stopColor="#808080" />
          <stop offset="100%" stopColor="#3d3d3d" />
        </linearGradient>
        <radialGradient id={id("lens")} cx="0.42" cy="0.36" r="0.72">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="34%" stopColor="#bdbdbd" />
          <stop offset="78%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <radialGradient id={id("bloom")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("beam")} gradientUnits="userSpaceOnUse" cx="160" cy="106" r="215">
          <stop offset="0%" style={{ stopColor: "var(--ink)" }} stopOpacity="0.16" />
          <stop offset="40%" style={{ stopColor: "var(--ink)" }} stopOpacity="0.06" />
          <stop offset="100%" style={{ stopColor: "var(--ink)" }} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" style={{ stopColor: "var(--ink)" }} stopOpacity="0.28" />
          <stop offset="55%" style={{ stopColor: "var(--ink)" }} stopOpacity="0.08" />
          <stop offset="100%" style={{ stopColor: "var(--ink)" }} stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("dome-clip")}>
          <path d="M88 146 A72 72 0 0 1 232 146 Z" />
        </clipPath>
      </defs>

      {/* Gaze beams, lit in step with the head's holds in droid-scan. */}
      <path d="M160 106 L-30 214 L-46 118 Z" fill={url("beam")} className="droid-beam-l" />
      <path d="M160 106 L350 214 L366 118 Z" fill={url("beam")} className="droid-beam-r" />

      <ellipse cx="160" cy="440" rx="112" ry="17" fill={url("shadow")} className="droid-shadow" />

      <g className="droid-float">
        <g className="droid-lean">
          {/* Side legs, behind the chassis. */}
          {[false, true].map((mirror) => (
            <g key={mirror ? "right" : "left"} transform={mirror ? "translate(320 0) scale(-1 1)" : undefined}>
              <rect x="42" y="156" width="44" height="180" rx="9" fill={url("paint")} {...OUTLINE} />
              <rect x="50" y="178" width="28" height="11" rx="3" fill={url("accent")} />
              <rect x="50" y="200" width="28" height="1.5" fill="#7d7d7d" opacity="0.55" />
              <path d="M46 232 h36" stroke="#5a5a5a" strokeWidth="1" opacity="0.45" />
              <circle cx="88" cy="176" r="18" fill={url("steel")} />
              <circle cx="88" cy="176" r="7" fill="#1a1a1a" />
              <rect x="56" y="330" width="16" height="52" fill={url("steel")} />
              <rect x="60" y="330" width="3" height="52" fill="#dcdcdc" opacity="0.4" />
              <rect x="44" y="326" width="40" height="16" rx="5" fill={url("paint")} {...OUTLINE} />
              <rect x="40" y="374" width="48" height="24" rx="7" fill={url("paint")} {...OUTLINE} />
              <circle cx="64" cy="386" r="5" fill="#3d3d3d" />
              <path d="M30 396 h68 l-8 30 H38 Z" fill={url("paint")} {...OUTLINE} />
              <path d="M38 420 h52 l-1 6 H39 Z" fill="#2a2a2a" />
            </g>
          ))}

          {/* Converter: a gear turning on the left leg's armour. */}
          {variant === "converter" && (
            <g className="droid-gear">
              {TEETH.map((angle) => (
                <rect key={angle} x="60" y="236" width="8" height="10" rx="1.5" fill="#1a1a1a" transform={`rotate(${angle} 64 258)`} />
              ))}
              <circle cx="64" cy="258" r="16" fill="#1a1a1a" />
              <circle cx="64" cy="258" r="10" fill={url("steel")} />
              <circle cx="64" cy="258" r="3.5" fill="#1a1a1a" />
            </g>
          )}

          {/* Centre leg: telescopes out of its housing on a long cycle. */}
          <rect x="146" y="350" width="28" height="36" rx="4" fill={url("steel")} />
          <rect x="151" y="376" width="18" height="26" rx="3" fill="#b4b4b4" className="droid-piston" />
          <g className="droid-deploy">
            <circle cx="160" cy="414" r="19" fill="#1a1a1a" stroke="#3d3d3d" strokeWidth="2" />
            <circle cx="160" cy="414" r="11" fill={url("steel")} />
            <g className="droid-wheel">
              <path d="M160 404 v20 M150 414 h20 M153 407 l14 14 M167 407 l-14 14" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
            </g>
            <circle cx="160" cy="414" r="3.5" fill="#5a5a5a" />
          </g>

          {/* Torso. */}
          <rect x="88" y="146" width="144" height="214" rx="13" fill={url("paint")} {...OUTLINE} />
          <rect x="92" y="152" width="6" height="200" rx="3" fill="#ffffff" opacity="0.6" />
          <rect x="218" y="152" width="12" height="200" rx="6" fill="#7d7d7d" opacity="0.3" />
          <rect x="92" y="138" width="136" height="15" rx="7" fill={url("steel")} />
          <rect x="96" y="162" width="128" height="17" rx="4" fill={url("accent")} />
          <rect x="98" y="163" width="124" height="1.5" rx="1" fill="#ffffff" opacity="0.5" />

          {variant === "converter" ? (
            /* A file going in on the left and coming out converted on the right. */
            <g>
              <rect x="112" y="186" width="96" height="38" rx="5" fill="#111111" stroke="#3d3d3d" strokeWidth="1" />
              <path d="M122 191 h10 l4 4 v13 h-14 Z" fill="none" stroke="#9a9a9a" strokeWidth="1.2" />
              <path d="M125 198 h8 M125 202 h6" stroke="#9a9a9a" strokeWidth="1" />
              <g className="droid-arrow">
                <path d="M144 200 h22 m-5 -4 l5 4 l-5 4" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <g className="droid-output">
                <path d="M176 191 h10 l4 4 v13 h-14 Z" fill="#ffffff" />
                <path d="M179 198 h8 M179 202 h6" stroke="#111111" strokeWidth="1" />
              </g>
              <rect x="122" y="214" width="76" height="4" rx="2" fill="#2e2e2e" />
              <rect x="122" y="214" width="76" height="4" rx="2" fill="#ffffff" className="droid-convert" />
            </g>
          ) : (
            <g>
              <rect x="112" y="188" width="96" height="34" rx="5" fill="#111111" stroke="#3d3d3d" strokeWidth="1" />
              {LOGIC_CELLS.map(([x, delay]) => (
                <g key={x} className="droid-cursor" style={{ animationDelay: delay }}>
                  <ellipse cx={x + 6} cy="198.5" rx="13" ry="10" fill={url("bloom")} />
                  <rect x={x} y="195" width="12" height="7" rx="2" fill="#ffffff" />
                </g>
              ))}
              <rect x="122" y="208" width="72" height="4" rx="2" fill="#2e2e2e" />
              <rect x="122" y="208" width="72" height="4" rx="2" fill="#ffffff" opacity="0.85" className="droid-progress" />
            </g>
          )}

          {/* Vents. */}
          {[100, 166].map((x) => (
            <g key={x}>
              <rect x={x} y="232" width="54" height="24" rx="4" fill="#1a1a1a" />
              {[238, 244, 250].map((y) => <rect key={y} x={x + 5} y={y} width="44" height="2" rx="1" fill="#b4b4b4" opacity="0.5" />)}
            </g>
          ))}

          {/* Access panels. */}
          {[100, 166].map((x) => (
            <g key={x}>
              <rect x={x} y="268" width="54" height="44" rx="4" fill="#dcdcdc" opacity="0.55" stroke="#7d7d7d" strokeWidth="1" />
              {[[8, 276], [46, 276], [8, 304], [46, 304]].map(([dx, y]) => <circle key={`${dx}-${y}`} cx={x + dx} cy={y} r="1.6" fill="#5a5a5a" />)}
            </g>
          ))}

          <rect x="96" y="320" width="128" height="17" rx="4" fill={url("accent")} />
          <rect x="98" y="321" width="124" height="1.5" rx="1" fill="#ffffff" opacity="0.45" />
          <rect x="90" y="342" width="140" height="18" rx="6" fill={url("steel")} />

          {/* Fixer: an arm out of the right access panel, tightening a wrench. */}
          {variant === "fixer" && (
            <g className="droid-arm">
              <path d="M200 292 L248 300 L262 262" fill="none" stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M200 292 L248 300 L262 262" fill="none" stroke="#b4b4b4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="200" cy="292" r="7" fill={url("steel")} stroke="#1a1a1a" strokeWidth="1.5" />
              <circle cx="248" cy="300" r="6" fill={url("steel")} stroke="#1a1a1a" strokeWidth="1.5" />
              <g className="droid-wrench">
                <path d="M259 266 L275 212" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" />
                <path d="M259 266 L275 212" stroke="#e6e6e6" strokeWidth="3.5" strokeLinecap="round" />
                {/* Open-ended head: a ring with the jaw cut out of the top. */}
                <path d="M283 183.17 A16 16 0 1 1 271 183.17 L273 192 L281 192 Z" fill="#e6e6e6" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
              </g>
            </g>
          )}

          {/* Dome: counter-rotates the lean so the head stays level. */}
          <g className="droid-level">
            {variant === "fixer" && (
              <g>
                <path d="M196 92 L210 54" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="210" cy="52" r="4" fill="#0a0a0a" />
                <circle cx="210" cy="52" r="2" fill="#ffffff" className="droid-blink" />
              </g>
            )}
            <path d="M88 146 A72 72 0 0 1 232 146 Z" fill={url("dome")} />
            <g clipPath={url("dome-clip")}>
              <g className="droid-tilt">
                <g className="droid-scan">
                  <path d="M108 146 L124 92 h13 l-9 54 Z" fill={url("accent")} opacity="0.92" />
                  <path d="M212 146 L196 92 h-13 l9 54 Z" fill={url("accent")} opacity="0.92" />
                  {variant === "converter" && <path d="M146 76 h28 l-3 10 h-22 Z" fill={url("accent")} opacity="0.92" />}
                  <rect x="84" y="126" width="152" height="12" fill={url("accent")} opacity="0.92" />
                  <rect x="84" y="138" width="152" height="9" fill="#050505" opacity="0.95" />
                  <path d="M160 74 v54 M132 80 l10 48 M188 80 l-10 48" stroke="#7d7d7d" strokeWidth="1" opacity="0.45" />
                  <rect x="152" y="80" width="16" height="9" rx="2" fill={url("steel")} />
                  <circle cx="160" cy="81" r="4" fill="#1a1a1a" />

                  {/* Camera eye. */}
                  <circle cx="160" cy="106" r="21" fill={url("steel")} />
                  <circle cx="160" cy="106" r="17" fill="#0a0a0a" />
                  <g className="droid-eye-blink">
                    <ellipse cx="160" cy="106" rx="27" ry="27" fill={url("bloom")} className="droid-lens" />
                    <g className="droid-iris">
                      <circle cx="160" cy="106" r="12" fill={url("lens")} className="droid-lens" />
                    </g>
                  </g>
                  <ellipse cx="154" cy="100" rx="5" ry="3" fill="#ffffff" opacity="0.45" />

                  {[126, 194].map((x) => (
                    <g key={x} className="droid-lens" style={{ animationDelay: "-1.1s" }}>
                      <circle cx={x} cy="120" r="6.5" fill="#0a0a0a" />
                      <circle cx={x} cy="120" r="2.6" fill="#ffffff" />
                    </g>
                  ))}

                  {DOME_LIGHTS.map(([x, delay]) => (
                    <rect key={x} x={x} y="140" width="7" height="5" rx="1.5" fill="#ffffff" className="droid-blink" style={{ animationDelay: delay }} />
                  ))}
                </g>
              </g>
              <ellipse cx="128" cy="98" rx="30" ry="18" fill="#ffffff" opacity="0.25" />
            </g>
            <path d="M88 146 A72 72 0 0 1 232 146" fill="none" {...OUTLINE} />
          </g>
        </g>
      </g>
    </svg>
  );
}
