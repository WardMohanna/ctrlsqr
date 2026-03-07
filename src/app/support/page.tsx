import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function SupportPage() {
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <Card>
        <Title level={2}>Support</Title>
        <Paragraph>
          Need help with CtrlSqr? Our support team is here for you.
        </Paragraph>
        <Paragraph>
          Email:{" "}
          <a href="mailto:support@lachocolita.com">support@lachocolita.com</a>
        </Paragraph>
        <Paragraph>Typical response time: up to 1 business day.</Paragraph>
      </Card>
    </div>
  );
}
