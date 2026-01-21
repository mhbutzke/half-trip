'use client';

import { useState } from 'react';
import {
  Clock,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCategoryInfo, formatDuration, formatTime } from '@/lib/utils/activity-categories';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { ActivityLink } from '@/types/database';

interface ActivityCardProps {
  activity: ActivityWithCreator;
  onEdit: (activity: ActivityWithCreator) => void;
  onDelete: (activity: ActivityWithCreator) => void;
}

export function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const categoryInfo = getCategoryInfo(activity.category);
  const CategoryIcon = categoryInfo.icon;
  const links = Array.isArray(activity.links) ? (activity.links as ActivityLink[]) : [];

  const hasDetails = activity.description || links.length > 0;

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${categoryInfo.bgColor}`}
          >
            <CategoryIcon className={`h-5 w-5 ${categoryInfo.color}`} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium leading-tight">{activity.title}</h3>

                {/* Time, Duration, and Attachments */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {activity.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(activity.start_time)}
                    </span>
                  )}
                  {activity.duration_minutes && (
                    <Badge variant="secondary" className="text-xs">
                      {formatDuration(activity.duration_minutes)}
                    </Badge>
                  )}
                </div>

                {/* Location */}
                {activity.location && (
                  <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{activity.location}</span>
                  </div>
                )}
              </div>

              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                    aria-label="Opções da atividade"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(activity)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(activity)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Expandable Content */}
            {hasDetails && (
              <>
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {/* Description */}
                    {activity.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {activity.description}
                      </p>
                    )}

                    {/* Links */}
                    {links.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Links
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {links.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-sm hover:bg-muted transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3.5 w-3.5" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3.5 w-3.5" />
                      Ver detalhes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
