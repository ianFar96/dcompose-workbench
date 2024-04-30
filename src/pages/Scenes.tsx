import { Card, CardContent, List, ListItemButton, ListSubheader } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Scene } from '../types/scene';

export default function Scenes() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    invoke<Scene[]>('get_scenes').then(scenes => {
      setScenes(scenes);
    }).catch(error => {
      // TODO: un bell'allert
      console.error(error);
    });
  }, []);

  return (
    <div className='p-6 bg-gray-100 h-screen'>
      <Card>
        <CardContent>
          <List
            aria-labelledby='nested-list-subheader'
            component='nav'
            subheader={
              <ListSubheader component='div' id='nested-list-subheader'>
                Scenes
              </ListSubheader>
            }
          >
            {scenes.map(scene => (
              <ListItemButton key={scene.name} onClick={() => navigate(`/scenes/${scene.name}`)}>
                {scene.name}
              </ListItemButton>
            ))}
          </List>
        </CardContent>
      </Card>
    </div>
  );
}
