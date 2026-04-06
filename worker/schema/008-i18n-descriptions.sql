-- Phase B: Data-layer i18n — bilingual gene variant descriptions

ALTER TABLE gene_variants ADD COLUMN description_zh TEXT;

UPDATE gene_variants SET description_zh = '基于边缘检测的标准信号扫描，含成交量与流动性过滤' WHERE id = 'polymarket-scanner:v1-baseline';
UPDATE gene_variants SET description_zh = '固定止损和最大持仓天数风控检查' WHERE id = 'polymarket-risk:v1-baseline';
UPDATE gene_variants SET description_zh = '固定止盈、追踪止损和概率反转监控' WHERE id = 'polymarket-monitor:v1-baseline';
UPDATE gene_variants SET description_zh = '市场结算检测与盈亏清算' WHERE id = 'polymarket-settler:v1-baseline';
UPDATE gene_variants SET description_zh = '基于边缘排序的信号分配与仓位管理' WHERE id = 'polymarket-trader:v1-baseline';
UPDATE gene_variants SET description_zh = '基于梯度的微进化，±2% 参数边界' WHERE id = 'polymarket-evolver:v1-baseline';
