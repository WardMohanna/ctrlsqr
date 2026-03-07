import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <Card>
        <Title level={2}>Privacy Policy</Title>
        <Paragraph>
          CtrlSqr collects and processes operational data required to provide
          the service. We only use data for product functionality, security, and
          support.
        </Paragraph>
        <Paragraph>
          We implement reasonable technical and organizational measures to
          protect your information.
        </Paragraph>
        <Paragraph>
          For privacy questions, contact{" "}
          <a href="mailto:privacy@lachocolita.com">privacy@lachocolita.com</a>.
        </Paragraph>
      </Card>
    </div>
  );
}
