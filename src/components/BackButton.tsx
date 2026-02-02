"use client";

import React, { useEffect, useState } from "react";
import { Button } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";

interface BackButtonProps extends React.ComponentProps<typeof Button> {
  children?: React.ReactNode;
}

export default function BackButton({ children, ...props }: BackButtonProps) {
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
    <Button {...props} icon={icon}>
      {children}
    </Button>
  );
}
