'use client';

import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Plus, X, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { activityCategoryList } from '@/lib/utils/activity-categories';
import { transportTypeList } from '@/lib/utils/transport-types';
import { DurationInput } from './duration-input';
import { LocationAutocomplete, type LocationCoords } from './location-autocomplete';
import type { ActivityLink } from '@/types/database';

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

interface ActivityFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  links: ActivityLink[];
  setLinks: (links: ActivityLink[]) => void;
  newLinkUrl: string;
  setNewLinkUrl: (url: string) => void;
  newLinkLabel: string;
  setNewLinkLabel: (label: string) => void;
  linkError: string;
  addLink: () => void;
  locationCoords: LocationCoords | null;
  setLocationCoords: (coords: LocationCoords | null) => void;
}

export function ActivityFormFields({
  form,
  links,
  setLinks,
  newLinkUrl,
  setNewLinkUrl,
  newLinkLabel,
  setNewLinkLabel,
  linkError,
  addLink,
  locationCoords,
  setLocationCoords,
}: ActivityFormFieldsProps) {
  const watchCategory = form.watch('category');

  // Clear transport_type when category changes away from 'transport'
  useEffect(() => {
    if (watchCategory !== 'transport') {
      form.setValue('transport_type', null);
    }
  }, [watchCategory, form]);

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Titulo
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input placeholder="Ex: Voo para o destino" {...field} aria-required="true" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category */}
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Categoria
              <RequiredMark />
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full" aria-required="true">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {activityCategoryList.map((category) => {
                  const Icon = category.icon;
                  return (
                    <SelectItem key={category.value} value={category.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${category.color}`} aria-hidden="true" />
                        {category.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Transport sub-type (conditional) */}
      {watchCategory === 'transport' && (
        <FormField
          control={form.control}
          name="transport_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de transporte</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {transportTypeList.map((transport) => {
                    const Icon = transport.icon;
                    return (
                      <SelectItem key={transport.value} value={transport.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          {transport.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Data
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} aria-required="true" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horário</FormLabel>
              <FormControl>
                <Input type="time" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Duration & Location */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duração</FormLabel>
              <FormControl>
                <DurationInput value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local</FormLabel>
              <FormControl>
                <LocationAutocomplete
                  value={field.value || ''}
                  onChange={field.onChange}
                  onPlaceSelect={setLocationCoords}
                  initialCoords={locationCoords}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Detalhes da atividade..."
                className="resize-none"
                rows={3}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Links section */}
      <div className="space-y-3">
        <FormLabel>Links úteis</FormLabel>

        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <ExternalLink
                  className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{link.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeLink(index)}
                  aria-label={`Remover link ${link.label}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do link"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="URL"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addLink}
              aria-label="Adicionar link"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          {linkError && <p className="text-sm text-destructive">{linkError}</p>}
        </div>
      </div>
    </div>
  );
}
