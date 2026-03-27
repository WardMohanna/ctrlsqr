"use client";

import React, { useEffect, useState } from "react";
import { Button } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";

interface BackButtonProps extends React.ComponentProps<typeof Button> {
  children?: React.ReactNode;
}

export default function BackButton({
  children,
  size,
  className,
  ...props
}: BackButtonProps) {
  const [isRtl, setIsRtl] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const syncLayoutState = () => {
      try {
        setIsRtl(document.documentElement?.dir === "rtl");
        setIsMobile(window.matchMedia("(max-width: 768px)").matches);
      } catch (e) {
        setIsRtl(false);
        setIsMobile(false);
      }
    };

    syncLayoutState();

    window.addEventListener("resize", syncLayoutState);

    return () => {
      window.removeEventListener("resize", syncLayoutState);
    };
  }, []);

  const icon = isRtl ? <ArrowRightOutlined /> : <ArrowLeftOutlined />;

  return (
    <div
      className="app-back-button-wrap"
      style={{
        width: "fit-content",
        marginLeft: isMobile || isRtl ? "auto" : 0,
        textAlign: isMobile || isRtl ? "right" : "left",
      }}
    >
      <Button
        {...props}
        className={["app-back-button", className].filter(Boolean).join(" ")}
        size={size ?? "large"}
        icon={icon}
        style={{
          color: "var(--primary-color)",
          background: "var(--header-bg)",
          border: "none",
          ...props.style,
        }}
      >
        {children}
      </Button>
    </div>
  );
}
