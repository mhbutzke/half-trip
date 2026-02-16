'use client';

import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ResponsiveFormContainer } from '@/components/ui/responsive-form-container';
import { Form } from '@/components/ui/form';
import { format } from 'date-fns';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useDialogState } from '@/hooks/use-dialog-state';
import { createActivitySchema, type CreateActivityInput } from '@/lib/validation/activity-schemas';
import { createActivity } from '@/lib/supabase/activities';
import { ActivityFormFields } from './activity-form-fields';
import type { LocationCoords } from './location-autocomplete';
import type { ActivityLink, FlightData, Json } from '@/types/database';

interface AddActivityDialogProps {
  tripId: string;
  defaultDate?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type TriggerElementProps = {
  onClick?: MouseEventHandler<HTMLElement>;
};

export function AddActivityDialog({
  tripId,
  defaultDate,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [links, setLinks] = useState<ActivityLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [linkError, setLinkError] = useState('');
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(null);
  const [flightNumber, setFlightNumber] = useState('');
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const {
    open,
    setOpen,
    handleOpenChange: baseHandleOpenChange,
  } = useDialogState({
    controlledOpen,
    controlledOnOpenChange,
    onClose: () => {
      form.reset({
        trip_id: tripId,
        title: '',
        date: defaultDate || '',
        start_time: '',
        duration_minutes: null,
        location: '',
        description: '',
        category: undefined,
        transport_type: null,
        links: [],
      });
      setLinks([]);
      setNewLinkUrl('');
      setNewLinkLabel('');
      setLinkError('');
      setLocationCoords(null);
      setFlightNumber('');
      setFlightData(null);
    },
  });

  const form = useForm<CreateActivityInput>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      trip_id: tripId,
      title: '',
      date: defaultDate || '',
      start_time: '',
      duration_minutes: null,
      location: '',
      description: '',
      category: undefined,
      transport_type: null,
      links: [],
    },
  });

  useEffect(() => {
    if (controlledOpen !== undefined && open && defaultDate) {
      form.setValue('date', defaultDate);
    }
  }, [controlledOpen, open, defaultDate, form]);

  const addLink = () => {
    setLinkError('');

    if (!newLinkUrl.trim()) {
      setLinkError('URL é obrigatória');
      return;
    }

    try {
      new URL(newLinkUrl);
    } catch {
      setLinkError('URL inválida');
      return;
    }

    if (!newLinkLabel.trim()) {
      setLinkError('Nome do link é obrigatório');
      return;
    }

    setLinks([...links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() }]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const handleFlightData = (data: FlightData | null) => {
    setFlightData(data);
    if (!data) return;

    // Auto-fill form fields from flight data
    const title =
      `Voo ${data.carrier || ''} ${data.flight_number || ''}: ${data.departure.iata || '?'} → ${data.arrival.iata || '?'}`.trim();
    form.setValue('title', title);

    if (data.departure.scheduled) {
      try {
        form.setValue('start_time', format(new Date(data.departure.scheduled), 'HH:mm'));
      } catch {
        // ignore invalid date
      }
    }

    if (data.duration) {
      form.setValue('duration_minutes', data.duration);
    }

    if (data.departure.airport) {
      form.setValue('location', data.departure.airport);
    }

    const desc = `Voo de ${data.departure.airport || data.departure.iata || '?'} (${data.departure.iata || ''}) para ${data.arrival.airport || data.arrival.iata || '?'} (${data.arrival.iata || ''}).`;
    form.setValue('description', desc);
  };

  const onSubmit = async (data: CreateActivityInput) => {
    setIsSubmitting(true);

    try {
      const metadata: { [key: string]: Json | undefined } = {};
      if (data.transport_type) {
        metadata.transport_type = data.transport_type;
      }
      if (locationCoords) {
        metadata.location_lat = locationCoords.lat;
        metadata.location_lng = locationCoords.lng;
        metadata.location_place_id = locationCoords.place_id;
      }
      if (flightData) {
        metadata.carrier = flightData.carrier;
        metadata.flight_number = flightData.flight_number;
        metadata.status = flightData.status;
        metadata.departure = flightData.departure as unknown as Json;
        metadata.arrival = flightData.arrival as unknown as Json;
        if (flightData.duration) metadata.duration = flightData.duration;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { transport_type: _transportType, ...activityData } = data;
      const result = await createActivity({
        ...activityData,
        start_time: activityData.start_time || null,
        duration_minutes: activityData.duration_minutes || null,
        location: activityData.location || null,
        description: activityData.description || null,
        links: links.length > 0 ? links : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Atividade adicionada!');
      setOpen(false);
      form.reset();
      setLinks([]);
      setLocationCoords(null);
      setFlightNumber('');
      setFlightData(null);
      onSuccess?.();
    } catch {
      toast.error('Erro ao adicionar atividade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      baseHandleOpenChange(newOpen);
    }
  };

  const handleTriggerKeyboard: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const uncontrolledTrigger =
    controlledOpen === undefined ? (
      trigger ? (
        isValidElement<TriggerElementProps>(trigger) ? (
          cloneElement(trigger, {
            onClick: (event) => {
              trigger.props.onClick?.(event);
              if (!event.defaultPrevented) {
                setOpen(true);
              }
            },
          })
        ) : (
          <span
            role="button"
            tabIndex={0}
            className="contents"
            onClick={() => setOpen(true)}
            onKeyDown={handleTriggerKeyboard}
          >
            {trigger}
          </span>
        )
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar atividade
        </Button>
      )
    ) : null;

  return (
    <>
      {uncontrolledTrigger}

      <ResponsiveFormContainer
        open={open}
        onOpenChange={handleOpenChange}
        title="Adicionar atividade"
        description="Adicione uma atividade ao roteiro da viagem."
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ActivityFormFields
              form={form}
              links={links}
              setLinks={setLinks}
              newLinkUrl={newLinkUrl}
              setNewLinkUrl={setNewLinkUrl}
              newLinkLabel={newLinkLabel}
              setNewLinkLabel={setNewLinkLabel}
              linkError={linkError}
              addLink={addLink}
              locationCoords={locationCoords}
              setLocationCoords={setLocationCoords}
              quickMode={isMobile}
              flightNumber={flightNumber}
              onFlightNumberChange={setFlightNumber}
              onFlightData={handleFlightData}
              flightData={flightData}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </Form>
      </ResponsiveFormContainer>
    </>
  );
}
