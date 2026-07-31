import { Tag, Tooltip } from "antd";
import type { DataQualityStatus } from "../api/types";
import { QUALITY_COLOR, QUALITY_LABEL } from "../lib/format";

interface Props {
  status: DataQualityStatus;
}

export function QualityTag({ status }: Props) {
  return (
    <Tooltip title={QUALITY_LABEL[status]}>
      <Tag color={QUALITY_COLOR[status]}>{status.replace(/_/g, " ")}</Tag>
    </Tooltip>
  );
}
