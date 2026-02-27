import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Zap, AlertTriangle, TrendingUp, Target } from 'lucide-react';

interface Reflection {
  goal?: string;
  outcome?: string;
  summary?: string;
  metrics?: Record<string, any>;
  duration_minutes?: number;
  tool_calls?: number;
  focus_score?: number;
  friction?: number;
  obstacles?: Array<{
    archetype?: string;
    name?: string;
    intensity?: number;
    description?: string;
  }>;
  acquisitions?: Array<{
    type?: string;
    name?: string;
    value?: number;
    description?: string;
  }>;
  energy_curve?: number[];
}

interface SessionData {
  session_id?: string;
  timestamp?: number;
  reflection?: Reflection;
}

interface SessionCardProps {
  data: SessionData;
}

export function SessionCard({ data }: SessionCardProps) {
  const reflection = data.reflection || {};
  const goal = reflection.goal || 'No goal specified';
  const outcome = reflection.outcome || 'unknown';
  const summary = reflection.summary || '';
  const duration = reflection.duration_minutes;
  const toolCalls = reflection.tool_calls;
  const focusScore = reflection.focus_score;
  const friction = reflection.friction;
  const obstacles = reflection.obstacles || [];
  const acquisitions = reflection.acquisitions || [];
  const energyCurve = reflection.energy_curve || [];

  const isSuccess = outcome === 'full_success' || outcome === 'success';
  const isPartialSuccess = outcome === 'partial_success';
  const isFailure = outcome === 'failure' || outcome === 'full_failure';

  const timestamp = data.timestamp ? new Date(data.timestamp * 1000) : null;

  return (
    <Card className="overflow-hidden border-border/50 dark:border-transparent bg-gradient-to-br from-card via-card to-cyan-50/20 dark:from-card dark:via-card dark:to-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
              {isPartialSuccess && <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />}
              {isFailure && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
              <span className="truncate">Session Reflection</span>
            </CardTitle>
            {timestamp && (
              <p className="text-xs text-muted-foreground mt-1">
                {timestamp.toLocaleString()}
              </p>
            )}
          </div>
          <Badge 
            variant={isSuccess ? 'default' : isFailure ? 'destructive' : 'secondary'}
            className="shrink-0"
          >
            {outcome.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Goal */}
        {goal && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Goal:
            </p>
            <p className="text-sm text-foreground/90">
              {goal}
            </p>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Summary:</p>
            <p className="text-sm text-foreground/90">
              {summary}
            </p>
          </div>
        )}

        {/* Metrics */}
        <div className="flex gap-2 flex-wrap">
          {duration !== undefined && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {duration} min
            </Badge>
          )}
          {toolCalls !== undefined && (
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              {toolCalls} tool calls
            </Badge>
          )}
          {focusScore !== undefined && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Focus: {focusScore.toFixed(1)}
            </Badge>
          )}
          {friction !== undefined && (
            <Badge 
              variant="outline" 
              className={`gap-1 ${friction > 0.5 ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400' : ''}`}
            >
              <AlertTriangle className="h-3 w-3" />
              Friction: {friction.toFixed(1)}
            </Badge>
          )}
        </div>

        {/* Obstacles */}
        {obstacles.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Obstacles:</p>
            <div className="space-y-2">
              {obstacles.map((obstacle, i) => (
                <div 
                  key={i}
                  className="p-2 rounded-lg bg-muted/50 border border-border/30"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {obstacle.name || 'Unknown obstacle'}
                    </p>
                    {obstacle.intensity !== undefined && (
                      <Badge 
                        variant="outline" 
                        className="text-xs shrink-0"
                      >
                        {(obstacle.intensity * 10).toFixed(0)}/10
                      </Badge>
                    )}
                  </div>
                  {obstacle.description && (
                    <p className="text-xs text-muted-foreground">
                      {obstacle.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acquisitions */}
        {acquisitions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Acquisitions:</p>
            <div className="space-y-2">
              {acquisitions.map((acquisition, i) => (
                <div 
                  key={i}
                  className="p-2 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {acquisition.name || 'Unknown acquisition'}
                    </p>
                    {acquisition.value !== undefined && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      >
                        +{acquisition.value}
                      </Badge>
                    )}
                  </div>
                  {acquisition.description && (
                    <p className="text-xs text-muted-foreground">
                      {acquisition.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy Curve */}
        {energyCurve.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Energy Curve:</p>
            <div className="flex items-end gap-1 h-16">
              {energyCurve.map((value, i) => (
                <div 
                  key={i}
                  className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t"
                  style={{ height: `${value * 100}%` }}
                  title={`Point ${i + 1}: ${(value * 10).toFixed(1)}/10`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
