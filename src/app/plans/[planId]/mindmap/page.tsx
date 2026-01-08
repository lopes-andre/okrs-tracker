import { Map, ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MindmapPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <>
      <PageHeader
        title="Mindmap"
        description="Visual hierarchy of your objectives and key results"
      >
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon-sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="icon-sm">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="icon-sm">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          Export Image
        </Button>
      </PageHeader>

      {/* Mindmap Canvas */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[600px] flex flex-col items-center justify-center bg-bg-1/30">
            <div className="text-center max-w-md px-4">
              <div className="w-20 h-20 rounded-card bg-bg-0 border border-border-soft flex items-center justify-center mx-auto mb-6 shadow-card">
                <Map className="w-10 h-10 text-text-muted" />
              </div>
              <h3 className="font-heading text-h4 text-text-strong mb-2">
                Interactive Mindmap Coming Soon
              </h3>
              <p className="text-body-sm text-text-muted mb-6">
                Visualize your entire OKR hierarchy in an interactive mindmap. 
                Drag nodes to reorganize, see progress at a glance, and export 
                as an image for presentations.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-small text-text-subtle">
                <span className="px-3 py-1 rounded-pill bg-bg-0 border border-border-soft">
                  Drag & Drop
                </span>
                <span className="px-3 py-1 rounded-pill bg-bg-0 border border-border-soft">
                  Progress Indicators
                </span>
                <span className="px-3 py-1 rounded-pill bg-bg-0 border border-border-soft">
                  Zoom & Pan
                </span>
                <span className="px-3 py-1 rounded-pill bg-bg-0 border border-border-soft">
                  Export PNG/SVG
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <Card className="bg-bg-0/50">
          <CardContent className="pt-6">
            <h4 className="font-heading font-semibold text-body mb-1">
              Powered by React Flow
            </h4>
            <p className="text-body-sm text-text-muted">
              Smooth, performant node-based diagrams with custom styling.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-bg-0/50">
          <CardContent className="pt-6">
            <h4 className="font-heading font-semibold text-body mb-1">
              Layout Persistence
            </h4>
            <p className="text-body-sm text-text-muted">
              Your custom node positions are saved and restored automatically.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-bg-0/50">
          <CardContent className="pt-6">
            <h4 className="font-heading font-semibold text-body mb-1">
              Progress Visualization
            </h4>
            <p className="text-body-sm text-text-muted">
              Each node shows real-time progress with color-coded indicators.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
