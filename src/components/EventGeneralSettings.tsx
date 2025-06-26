import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateEventDetails } from '@/api/apiService';
import type { UpdateEventDetailsPayload } from '@/api/types';
import { useConferenceStore } from '@/store/conferenceStore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IconDeviceFloppy } from '@tabler/icons-react';

export function EventGeneralSettings() {
  const { slug: eventSlug } = useParams<{ slug?: string }>();
  const queryClient = useQueryClient();
  const { activeConference, setActiveConference } = useConferenceStore();

  const [name, setName] = useState('');
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [initialName, setInitialName] = useState('');
  const [initialVotingEnabled, setInitialVotingEnabled] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (activeConference) {
      setName(activeConference.name);
      setVotingEnabled(activeConference.voting_enabled);
      setInitialName(activeConference.name);
      setInitialVotingEnabled(activeConference.voting_enabled);
      setIsDirty(false);
    }
  }, [activeConference]);

  useEffect(() => {
    if (activeConference) { 
      const nameChanged = name !== initialName;
      const votingChanged = votingEnabled !== initialVotingEnabled;
      setIsDirty(nameChanged || votingChanged);
    }
  }, [name, votingEnabled, initialName, initialVotingEnabled, activeConference]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateEventDetailsPayload) => {
      if (!eventSlug) throw new Error("Event slug is not defined");
      return updateEventDetails(eventSlug, payload);
    },
    onSuccess: (_data, variables) => {
      toast.success('Event settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['events'] });

      setInitialName(variables.name);
      setInitialVotingEnabled(variables.voting_enabled);
      setIsDirty(false);

      if (activeConference) {
        setActiveConference({
          name: variables.name,
          slug: activeConference.slug,
          permissions: activeConference.permissions,
          voting_enabled: variables.voting_enabled,
        });
      }

    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!eventSlug) return;
    updateMutation.mutate({ name, voting_enabled: votingEnabled });
  };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>General Event Settings</CardTitle>
          <CardDescription>
            Configure the name and voting status for "{initialName || eventSlug}".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter event name"
              disabled={updateMutation.isPending}
            />
          </div>
          <div className="flex items-center space-x-3">
            <Switch
              id="votingEnabled"
              checked={votingEnabled}
              onCheckedChange={setVotingEnabled}
              disabled={updateMutation.isPending}
              aria-labelledby="votingEnabledLabel"
            />
            <Label htmlFor="votingEnabled" id="votingEnabledLabel" className="cursor-pointer">
              Voting Enabled
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
          >
            <IconDeviceFloppy className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}