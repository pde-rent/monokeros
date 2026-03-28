import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#001EF4",
      }}
    >
      {/* Monokeros pixel art simplified */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" fill="#001EF4" />
        <path d="M22 32H20V30H18V28H12V26H10V22H8V24V28H6V26H4V30H6V32H4H2H22Z" fill="#A5B0FF" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14 6H12V8V11H10V14H8V18H6V24H8V22H10H12V26H18H22V28H24H28V26H30V22H28V20H26V18H24V16H22V14H20V12H18V10H16V8V4H14V6ZM18 18H14V14H16H18V16V18ZM24 24V22H26V24H24Z"
          fill="#A5B0FF"
        />
        <path d="M20 8H16V10H18V12H20H22V10H24V8H26V6H28V4H24V6H20V8Z" fill="white" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 18V32H2H4H6V30H4V26H6V28H8V24H6V18H8V14H10V11H12V8H10V10H6V12H4V14H2V18H0ZM28 2V4H30V2H28ZM14 14H16V16H18V18H14V14Z"
          fill="white"
        />
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
