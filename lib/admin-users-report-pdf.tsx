import { Document, Page, View, pdf } from '@react-pdf/renderer';
import { PdfxThemeProvider } from '@/lib/pdfx-theme-context';
import { theme } from '@/lib/pdfx-theme';
import { PageHeader } from '@/components/pdfx/page-header/pdfx-page-header';
import { Section } from '@/components/pdfx/section/pdfx-section';
import { KeyValue } from '@/components/pdfx/key-value/pdfx-key-value';
import { DataTable } from '@/components/pdfx/data-table/pdfx-data-table';
import { Divider } from '@/components/pdfx/divider/pdfx-divider';
import { Heading } from '@/components/pdfx/heading/pdfx-heading';
import { Text } from '@/components/pdfx/text/pdfx-text';
import { PdfPageNumber } from '@/components/pdfx/page-number/pdfx-page-number';
import { PdfImage } from '@/components/pdfx/pdf-image/pdfx-pdf-image';
import { PdfWatermark } from '@/components/pdfx/watermark/pdfx-watermark';
import { Stack } from '@/components/pdfx/stack/pdfx-stack';
import { PdfCard } from '@/components/pdfx/card/pdfx-card';
import { PdfQRCode } from '@/components/pdfx/qrcode/pdfx-qrcode';
import { PdfGraph } from '@/components/pdfx/graph/pdfx-graph';

export type AdminPdfSummaryItem = {
  label: string;
  value: string | number;
};

export type AdminUsersPdfOptions = {
  title: string;
  subtitle?: string;
  generatedAt: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
  summary?: AdminPdfSummaryItem[];
  orientation?: 'portrait' | 'landscape';
  logoPath?: string;
};

const EMPTY_SUMMARY: AdminPdfSummaryItem[] = [];
const SENSITIVE_COLUMN_PATTERN = /correo|email|e-?mail|mail/i;

const chunkSummary = (summary: AdminPdfSummaryItem[]) => {
  if (summary.length <= 4) return [summary, []] as const;
  const pivot = Math.ceil(summary.length / 2);
  return [summary.slice(0, pivot), summary.slice(pivot)] as const;
};

const isNumericColumn = (column: string) =>
  /partidas|victorias|winrate|puntos|promedio|total|score|ratio/i.test(column);

const isAverageColumn = (column: string) => /winrate|ratio|promedio|puntosxpartida/i.test(column);

const formatColumnHeader = (column: string) => {
  const normalized = column.replace(/_/g, ' ').trim();
  const lower = normalized.toLowerCase();

  if (lower === 'winrate') return 'Win Rate';
  if (lower === 'puntosxpartida') return 'Puntos x Partida';

  return normalized
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
};

const getColumnWeight = (column: string): number => {
  const normalized = column.toLowerCase();
  if (normalized.includes('usuario')) return 1.8;
  if (normalized.includes('pais')) return 1.1;
  if (normalized.includes('registro')) return 1.05;
  if (normalized.includes('rol')) return 1.55;
  if (normalized.includes('partidas')) return 0.85;
  if (normalized.includes('victorias')) return 0.95;
  if (normalized.includes('winrate')) return 0.95;
  if (normalized.includes('puntosxpartida')) return 1.35;
  if (normalized.includes('puntos')) return 0.95;
  if (normalized.includes('segmento')) return 1.15;
  return 1;
};

const buildColumnWidthMap = (columns: string[]) => {
  const weightedColumns = columns.map((column) => ({
    column,
    weight: getColumnWeight(column),
  }));
  const totalWeight = weightedColumns.reduce((acc, current) => acc + current.weight, 0) || 1;

  return new Map(
    weightedColumns.map(({ column, weight }) => [
      column,
      `${((weight / totalWeight) * 100).toFixed(2)}%`,
    ])
  );
};

const sanitizeColumns = (columns: string[]) => {
  const filtered = columns.filter((column) => !SENSITIVE_COLUMN_PATTERN.test(column));
  return filtered.length > 0 ? filtered : columns;
};

const normalizeCellValue = (value: unknown): string | number => {
  if (value === null || value === undefined || value === '') return 'N/D';
  return typeof value === 'number' ? value : String(value);
};

const toNumericValue = (value: string | number): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompactNumber = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return `${value}`;
};

const resolveLogoUri = (logoPath?: string) => {
  if (!logoPath || typeof window === 'undefined') return undefined;

  try {
    return new URL(logoPath, window.location.origin).toString();
  } catch {
    return undefined;
  }
};

const resolveAppOrigin = () => {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.SITE_URL;

  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/+$/, '');
  }

  return process.env.NODE_ENV === 'production'
    ? 'https://parkeando.xyz'
    : 'http://localhost:3000';
};

const palette = {
  ink: '#0F172A',
  mutedInk: '#334155',
  panel: '#E2E8F0',
  panelSoft: '#F1F5F9',
  panelTop: '#EAF4FF',
  border: '#CBD5E1',
  footer: '#475569',
};

const UsersAdminReportDocument = ({
  title,
  subtitle,
  generatedAt,
  columns,
  rows,
  summary = EMPTY_SUMMARY,
  orientation = 'landscape',
  logoPath,
}: AdminUsersPdfOptions) => {
  const visibleColumns = sanitizeColumns(columns);
  const visibleRows = rows.map((row) => {
    const normalized: Record<string, string | number> = {};
    for (const column of visibleColumns) {
      normalized[column] = normalizeCellValue(row[column]);
    }
    return normalized;
  });

  const logoUri = resolveLogoUri(logoPath);
  const [summaryLeft, summaryRight] = chunkSummary(summary);
  const columnWidthMap = buildColumnWidthMap(visibleColumns);
  const usernameColumn =
    visibleColumns.find((column) => /usuario|username|user|nombre/i.test(column)) ??
    visibleColumns[0] ??
    'usuario';
  const pointsColumn = visibleColumns.find((column) => {
    const normalized = column.toLowerCase();
    return (
      normalized.includes('puntos') &&
      !normalized.includes('xpartida') &&
      !normalized.includes('promedio')
    );
  });
  const roleColumn = visibleColumns.find((column) => /rol|role|segmento/i.test(column));

  const tableColumns = visibleColumns.map((column) => ({
    key: column,
    header: formatColumnHeader(column),
    align: isNumericColumn(column) ? ('right' as const) : ('left' as const),
    width: columnWidthMap.get(column),
  }));

  const footerTotals: Partial<Record<string, string | number>> = {};
  if (visibleRows.length > 0) {
    for (const column of visibleColumns) {
      const numericValues = visibleRows
        .map((row) => row[column])
        .filter((value) => typeof value === 'number') as number[];

      if (numericValues.length === visibleRows.length) {
        if (isAverageColumn(column)) {
          const avg = numericValues.reduce((acc, value) => acc + value, 0) / Math.max(1, numericValues.length);
          footerTotals[column] = Number(avg.toFixed(1));
        } else {
          footerTotals[column] = numericValues.reduce((acc, value) => acc + value, 0);
        }
      }
    }

    if (visibleColumns.length > 0) {
      footerTotals[visibleColumns[0]] = 'Totales / prom.';
    }
  }

  const topPlayersChartData = (pointsColumn
    ? visibleRows.map((row) => ({
        label: String(row[usernameColumn] ?? 'N/D'),
        value: toNumericValue(row[pointsColumn]),
      }))
    : []
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topPlayersGraphData = topPlayersChartData.map((item) => ({
    label: item.label,
    value: Number(Math.log10(item.value + 1).toFixed(4)),
  }));

  const topPlayersScoreItems = topPlayersChartData.map((item) => ({
    key: item.label,
    value: formatCompactNumber(item.value),
  }));

  const roleCountMap = new Map<string, number>();
  for (const row of visibleRows) {
    const rawRole = roleColumn ? String(row[roleColumn] ?? 'Sin rol') : 'Jugadores';
    const roleLabel = rawRole.trim() || 'Sin rol';
    roleCountMap.set(roleLabel, (roleCountMap.get(roleLabel) ?? 0) + 1);
  }

  const roleDistributionData = Array.from(roleCountMap.entries()).map(([label, value]) => ({
    label: label.length > 18 ? `${label.slice(0, 17)}...` : label,
    value,
  }));

  const validationUrl = `${resolveAppOrigin()}/admin/dashboard?report=usuarios&generatedAt=${encodeURIComponent(generatedAt)}`;

  const pageStyle = {
    paddingTop: theme.spacing.page.marginTop,
    paddingRight: theme.spacing.page.marginRight,
    paddingBottom: theme.spacing.page.marginBottom + 14,
    paddingLeft: theme.spacing.page.marginLeft,
    backgroundColor: '#ffffff',
  };

  const headerStyle = {
    marginBottom: theme.spacing.sectionGap,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  };

  const compactHeaderStyle = {
    ...headerStyle,
    marginBottom: 8,
  };

  const renderFooter = () => (
    <View style={{ marginTop: theme.spacing.sectionGap }}>
      <Divider spacing="none" color={palette.border} />
      <Stack direction="horizontal" justify="between" align="center" gap="sm">
        <Text variant="xs" color={palette.footer} noMargin>
          Parkeando Edicion Universitaria
        </Text>
        <Text variant="xs" color={palette.footer} noMargin>
          Reporte administrativo
        </Text>
        <Text variant="xs" color={palette.footer} noMargin>
          {generatedAt}
        </Text>
      </Stack>
      <PdfPageNumber
        format="Página {page} de {total}"
        align="right"
        size="xs"
        muted
      />
    </View>
  );

  return (
    <PdfxThemeProvider theme={theme}>
      <Document>
        <Page size="A4" orientation={orientation} style={pageStyle}>
          <PdfWatermark
            text="CONFIDENCIAL"
            opacity={0.05}
            fontSize={48}
            color="mutedForeground"
            angle={-32}
            position="center"
            fixed
          />

          <PageHeader
            title={title}
            subtitle={subtitle || 'Reporte administrativo de jugadores'}
            rightText={`Generado: ${generatedAt}`}
            rightSubText="Panel de administración"
            variant={logoUri ? 'logo-left' : 'simple'}
            background={palette.panel}
            titleColor={palette.ink}
            style={headerStyle}
            logo={logoUri ? <PdfImage src={logoUri} variant="avatar" width={38} height={38} /> : undefined}
          />

          <PdfCard
            title="Resumen ejecutivo"
            variant="muted"
            padding="md"
            style={{ borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft }}
          >
            {summary.length > 0 ? (
              <Stack direction="horizontal" gap="lg" align="start">
                <View style={{ flex: 1 }}>
                  <KeyValue
                    items={summaryLeft.map((item) => ({ key: item.label, value: String(item.value) }))}
                    direction="horizontal"
                    divided
                    size="sm"
                    boldValue
                  />
                </View>
                {summaryRight.length > 0 ? (
                  <View style={{ flex: 1 }}>
                    <KeyValue
                      items={summaryRight.map((item) => ({ key: item.label, value: String(item.value) }))}
                      direction="horizontal"
                      divided
                      size="sm"
                      boldValue
                    />
                  </View>
                ) : null}
              </Stack>
            ) : null}
          </PdfCard>

          {renderFooter()}
        </Page>

        <Page size="A4" orientation={orientation} style={pageStyle}>
          <PdfWatermark
            text="CONFIDENCIAL"
            opacity={0.05}
            fontSize={48}
            color="mutedForeground"
            angle={-32}
            position="center"
            fixed
          />

          <PageHeader
            title="Validación visual del documento"
            subtitle="Escaneo rápido y distribución por rol"
            rightText={`${visibleRows.length} registros`}
            rightSubText={`Corte: ${generatedAt}`}
            variant={logoUri ? 'logo-left' : 'simple'}
            background={palette.panelSoft}
            titleColor={palette.ink}
            style={headerStyle}
            logo={logoUri ? <PdfImage src={logoUri} variant="avatar" width={38} height={38} /> : undefined}
          />

          <Section
            variant="card"
            spacing="sm"
            padding="sm"
            background={palette.panelSoft}
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10 }}
          >
            <Stack direction="horizontal" gap="md" align="start">
              <View style={{ width: 150 }}>
                <PdfQRCode
                  value={validationUrl}
                  size={108}
                  errorLevel="M"
                  margin={1}
                  caption="Abrir validación"
                />
              </View>
              <View style={{ flex: 1 }}>
                <PdfGraph
                  variant="donut"
                  title="Distribución por rol"
                  subtitle={`${visibleRows.length} registros exportados`}
                  data={
                    roleDistributionData.length > 0
                      ? roleDistributionData
                      : [{ label: 'Sin datos', value: 1 }]
                  }
                  centerLabel={`${visibleRows.length}`}
                  width={300}
                  height={170}
                  colors={['#0EA5E9', '#14B8A6', '#F59E0B', '#6366F1', '#F43F5E']}
                  legend="bottom"
                  noWrap={false}
                />
              </View>
            </Stack>
          </Section>

          {renderFooter()}
        </Page>

        <Page size="A4" orientation={orientation} style={pageStyle}>
          <PdfWatermark
            text="CONFIDENCIAL"
            opacity={0.05}
            fontSize={48}
            color="mutedForeground"
            angle={-32}
            position="center"
            fixed
          />

          <PageHeader
            title="Top jugadores por puntos"
            subtitle="Ranking de puntaje acumulado"
            rightText={`Top ${topPlayersChartData.length || 0}`}
            rightSubText={`Corte: ${generatedAt}`}
            variant={logoUri ? 'logo-left' : 'simple'}
            background={palette.panelTop}
            titleColor={palette.ink}
            style={compactHeaderStyle}
            logo={logoUri ? <PdfImage src={logoUri} variant="avatar" width={38} height={38} /> : undefined}
          />

          <Section
            variant="card"
            spacing="none"
            padding="sm"
            noWrap={false}
            background={palette.panelSoft}
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10 }}
          >
            <PdfGraph
              variant="horizontal-bar"
              title="Ranking rápido"
              subtitle="Top 5 por puntaje"
              data={
                topPlayersGraphData.length > 0
                  ? topPlayersGraphData
                  : [{ label: 'Sin datos', value: 0 }]
              }
              fullWidth
              containerPadding={6}
              wrapperPadding={4}
              height={136}
              colors={['#0EA5E9', '#22C55E', '#6366F1', '#F59E0B', '#F97316', '#EC4899']}
              legend="none"
              noWrap={false}
            />
            {topPlayersScoreItems.length > 0 ? (
              <View style={{ marginTop: 4 }}>
                <Text variant="xs" color={palette.mutedInk} noMargin>
                  {`Top 5: ${topPlayersScoreItems.map((item) => `${item.key} (${item.value})`).join(' · ')}`}
                </Text>
              </View>
            ) : null}
          </Section>

          {renderFooter()}
        </Page>

        <Page size="A4" orientation={orientation} style={pageStyle}>
          <PdfWatermark
            text="CONFIDENCIAL"
            opacity={0.05}
            fontSize={48}
            color="mutedForeground"
            angle={-32}
            position="center"
            fixed
          />

          <PageHeader
            title="Detalle de jugadores"
            subtitle="Datos normalizados listos para auditoría operativa interna"
            rightText={`${visibleRows.length} registros en exportación`}
            rightSubText={`Corte: ${generatedAt}`}
            variant={logoUri ? 'logo-left' : 'simple'}
            background={palette.panel}
            titleColor={palette.ink}
            style={headerStyle}
            logo={logoUri ? <PdfImage src={logoUri} variant="avatar" width={38} height={38} /> : undefined}
          />

          <Section
            variant="card"
            spacing="sm"
            padding="sm"
            background={palette.panelSoft}
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10 }}
          >
            <Heading level={5} noMargin>
              Detalle de jugadores
            </Heading>
            <DataTable
              columns={tableColumns}
              data={visibleRows}
              footer={Object.keys(footerTotals).length > 1 ? footerTotals : undefined}
              variant="bordered"
              stripe
              size="compact"
            />
          </Section>

          {renderFooter()}
        </Page>
      </Document>
    </PdfxThemeProvider>
  );
};

export const buildAdminUsersPdfBlob = async (options: AdminUsersPdfOptions) => {
  const instance = pdf(<UsersAdminReportDocument {...options} />);
  return instance.toBlob();
};