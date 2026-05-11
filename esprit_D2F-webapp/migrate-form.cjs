const fs = require("fs");
let c = fs.readFileSync("src/pages/FormationWorkflowForm.jsx", "utf8");

// Grid -> Row/Col
c = c.replace(/<Grid container spacing={3}>/g, "<Row gutter={[24,24]}>");
c = c.replace(/<Grid container spacing={2}>/g, "<Row gutter={[16,16]}>");
c = c.replace(/<Grid container spacing={1}>/g, "<Row gutter={[8,8]}>");
c = c.replace(/<Grid item xs={12} sm={6}>/g, "<Col xs={24} sm={12}>");
c = c.replace(/<Grid item xs={12} sm={4}>/g, "<Col xs={24} sm={8}>");
c = c.replace(/<Grid item xs={6}>/g, "<Col span={12}>");
c = c.replace(/<Grid item xs={4}>/g, "<Col span={8}>");
c = c.replace(/<Grid item xs={3}>/g, "<Col span={6}>");
c = c.replace(/<Grid item xs={12}>/g, "<Col span={24}>");
c = c.replace(/<Grid item xs={8}>/g, "<Col span={16}>");
c = c.replace(/<\/Grid>/g, "</Col>");

// Box -> div
c = c.replace(/<Box>/g, "<div>");
c = c.replace(/<Box sx={{[^}]*}}>/g, "<div>");
c = c.replace(/<Box sx={{[^}]*}},? ?[^>]*>/g, "<div>");
c = c.replace(/<\/Box>/g, "</div>");

// Paper -> Card
c = c.replace(/<Paper[^>]*>/g, '<Card style={{padding:16}}>');
c = c.replace(/<\/Paper>/g, "</Card>");

// CardContent -> remove
c = c.replace(/<CardContent>/g, "");
c = c.replace(/<\/CardContent>/g, "");

// Typography variant="h6" -> Title level=5
c = c.replace(/<Typography variant="h6"[^>]*>/g, "<Title level={5}>");
c = c.replace(/<Typography variant="h5"[^>]*>/g, "<Title level={4}>");
c = c.replace(/<Typography variant="subtitle2"[^>]*>/g, "<Text strong>");
c = c.replace(/<Typography variant="body2"[^>]*>/g, "<Text type=\"secondary\">");
c = c.replace(/<Typography variant="body1"[^>]*>/g, "<Text>");
c = c.replace(/<Typography>/g, "<Text>");
c = c.replace(/<Typography sx={{[^}]*}}>/g, "<Text>");
c = c.replace(/<Typography sx={{[^}]*}},? ?[^>]*>/g, "<Text>");
c = c.replace(/<\/Typography>/g, "</Text>");

// TextField -> Input/Select
c = c.replace(/<TextField label="([^"]*)" fullWidth value={([^}]*)} onChange={\(([^)]*)\) => ([^}]*)} required variant="outlined" \/>/g, '<><Text type="secondary">$1</Text><Input value={$2} onChange={($3) => $4} required /></>');
c = c.replace(/<TextField label="([^"]*)" fullWidth multiline={f\.multiline} rows={f\.multiline \? 3 : 1} value={f\.val} onChange={\(([^)]*)\) => f\.set\(([^)]*)\)} \/>/g, '<><Text type="secondary">{f.label}</Text><Input.TextArea rows={f.multiline ? 3 : 1} value={f.val} onChange={(e) => f.set(e.target.value)} /></>');

// Button MUI -> Ant
c = c.replace(/variant="contained"/g, 'type="primary"');
c = c.replace(/variant="outlined"/g, '');
c = c.replace(/color="error"/g, 'danger');
c = c.replace(/color="primary"/g, 'type="primary"');
c = c.replace(/startIcon={<UploadFileIcon \/>}/g, 'icon={<UploadOutlined />}');
c = c.replace(/startIcon={<DeleteIcon \/>}/g, 'icon={<DeleteOutlined />}');

// Icons
c = c.replace(/<CalendarMonthIcon[^/]*\/>/g, "<CalendarOutlined />");
c = c.replace(/<GroupsIcon[^/]*\/>/g, "<TeamOutlined />");
c = c.replace(/<SchoolIcon[^/]*\/>/g, "<ReadOutlined />");
c = c.replace(/<MonetizationOnIcon[^/]*\/>/g, "<DollarOutlined />");
c = c.replace(/<LinkIcon[^/]*\/>/g, "<LinkOutlined />");
c = c.replace(/<ExpandLessIcon[^/]*\/>/g, "<UpOutlined />");
c = c.replace(/<ExpandMoreIcon[^/]*\/>/g, "<DownOutlined />");
c = c.replace(/<DeleteIcon[^/]*\/>/g, "<DeleteOutlined />");

// IconButton -> Button type=text
c = c.replace(/<IconButton[^>]*>/g, '<Button type="text" danger>');
c = c.replace(/<\/IconButton>/g, "</Button>");

// Collapse in= -> conditional
c = c.replace(/<Collapse in={([^}]*)}>/g, "{$1 && <div>");
c = c.replace(/<\/Collapse>/g, "</div>}");

// Stepper -> Steps
c = c.replace(/<Stepper activeStep={activeStep}[^>]*>[\s\S]*?<\/Stepper>/g, '<Steps current={activeStep} items={STEPS.map(s => ({title: s}))} style={{marginBottom:24}} />');

// FormControlLabel + Switch
c = c.replace(/<FormControlLabel control={<Switch checked={([^}]*)} onChange={\(([^)]*)\) => ([^}]*)} color="error" \/>} label="([^"]*)" \/>/g, '<Space><Switch checked={$1} onChange={(val) => $3} /> <Text>$4</Text></Space>');

// Alert MUI -> AntAlert
c = c.replace(/<Alert severity="info"[^>]*>/g, '<AntAlert type="info" showIcon>');
c = c.replace(/<Alert severity="warning"[^>]*>/g, '<AntAlert type="warning" showIcon>');
c = c.replace(/<Alert severity="error"[^>]*>/g, '<AntAlert type="error" showIcon>');
c = c.replace(/<Alert severity="success"[^>]*>/g, '<AntAlert type="success" showIcon>');
c = c.replace(/<\/Alert>/g, "</AntAlert>");

// InputAdornment -> prefix
c = c.replace(/InputAdornment/g, "prefix");

// Autocomplete -> Select (simple)
c = c.replace(/<Autocomplete options={([^}]*)} getOptionLabel={\(([^)]*)\) => ([^}]*)} value={([^}]*)} onChange={\(([^)]*)\), ([^}]*)} renderInput={\(([^)]*)\) => <TextField[^/]*\/>} \/>/g, 
  '<Select showSearch style={{width:"100%"}} value={$4?.id} onChange={(val) => $5($1.find(x => x.id === val) || null)} options={$1.map($2 => ({value: $2.id, label: $3}))} optionFilterProp="label" />');

fs.writeFileSync("src/pages/FormationWorkflowForm.jsx", c);
console.log("Migration done!");
