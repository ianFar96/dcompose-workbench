import { Add, Download, Refresh } from '@mui/icons-material';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Typography } from '@mui/material';
import React, { useCallback } from 'react';

type SceneMenuProps = {
  anchorEl: HTMLElement
  handleClose: () =>void
  open: boolean
  actions: {
    createService: () => void
    reloadScene: () => void
    openVsCode: () => void
    importScene: () => void
  }
}

export default function SceneMenu(props: SceneMenuProps) {
  const onMenuItemClick = useCallback((action: () => void) => {
    action();
    props.handleClose();
  }, [props]);

  return (
    <>
      <Menu
        anchorEl={props.anchorEl}
        onClose={props.handleClose}
        open={props.open}
      >
        <MenuList className='w-60' dense>
          <MenuItem onClick={() => onMenuItemClick(props.actions.createService)}>
            <ListItemIcon>
              <Add fontSize='small' />
            </ListItemIcon>
            <ListItemText className='w-48'>Create service</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => onMenuItemClick(props.actions.importScene)}>
            <ListItemIcon>
              <Download fontSize='small' />
            </ListItemIcon>
            <ListItemText className='w-48'>Import scene</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onMenuItemClick(props.actions.reloadScene)}>
            <ListItemIcon>
              <Refresh fontSize='small' />
            </ListItemIcon>
            <ListItemText className='w-48'>Reload scene</ListItemText>
            <Typography color='text.secondary' variant='body2'>
              ctrl+r
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => onMenuItemClick(props.actions.openVsCode)}>
            <ListItemIcon>
              <img alt='' className='w-4 ml-[2px]' src='/vscode.svg' />
            </ListItemIcon>
            <ListItemText className='w-48'>Open on VS Code</ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>
    </>
  );
}
