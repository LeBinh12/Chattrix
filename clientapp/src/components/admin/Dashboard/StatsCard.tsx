import type { ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  accentColor: string;
  iconBg: string;
}

export default function StatsCard({
  label,
  value,
  sub,
  icon,
  accentColor,
  iconBg,
}: StatsCardProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: "14px 16px",
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 16px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 1px 4px rgba(0,0,0,0.07)";
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#1e293b",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
  );
}
