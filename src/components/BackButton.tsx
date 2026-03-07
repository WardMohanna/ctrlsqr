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
  ...props
}: BackButtonProps) {
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    try {
      setIsRtl(document.documentElement?.dir === "rtl");
    } catch (e) {
      setIsRtl(false);
    }
  }, []);

  const icon = isRtl ? <ArrowRightOutlined /> : <ArrowLeftOutlined />;

  return (
    <div style={{ textAlign: isRtl ? "right" : "left" }}>
      <Button
        {...props}
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
