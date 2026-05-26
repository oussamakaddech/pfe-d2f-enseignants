import { memo } from "react";
import { Row, Col, Skeleton } from "antd";

const ContentSkeleton = memo(function ContentSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton.Input active style={{ width: 300, height: 28, marginBottom: 24, display: "block" }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Skeleton.Node active style={{ width: "100%", height: 110, borderRadius: 14, display: "block" }} />
          </Col>
        ))}
      </Row>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
});

export default ContentSkeleton;
