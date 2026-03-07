import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <Card>
        <Title level={2}>Terms of Service</Title>
        <Paragraph>
          By using CtrlSqr, you agree to use the system responsibly and in
          accordance with applicable laws and regulations.
        </Paragraph>
        <Paragraph>
          You are responsible for maintaining the confidentiality of your
          account and for all activities that occur under your account.
        </Paragraph>
        <Paragraph>
          La Chocolita Software may update these terms from time to time.
        </Paragraph>
      </Card>
    </div>
  );
}
