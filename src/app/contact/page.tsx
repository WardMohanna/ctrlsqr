import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function ContactPage() {
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <Card>
        <Title level={2}>Contact Us</Title>
        <Paragraph>
          For business inquiries, partnerships, and product questions, contact
          us.
        </Paragraph>
        <Paragraph>
          Email: <a href="mailto:info@lachocolita.com">info@lachocolita.com</a>
        </Paragraph>
        <Paragraph>
          Support:{" "}
          <a href="mailto:support@lachocolita.com">support@lachocolita.com</a>
        </Paragraph>
      </Card>
    </div>
  );
}
