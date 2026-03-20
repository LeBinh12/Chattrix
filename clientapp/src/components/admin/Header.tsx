import * as React from 'react';
import GlobalStyles from '@mui/joy/GlobalStyles';
import Sheet from '@mui/joy/Sheet';
import Box from '@mui/joy/Box';
import IconButton from '@mui/joy/IconButton';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import Typography from '@mui/joy/Typography';
import { toggleSidebar } from '../../utils/sidebar';

export default function Header() {
  return (
    <Sheet
      sx={{
        display: { xs: 'flex', md: 'none' },
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        width: '100%',
        height: 'var(--Header-height)',
        zIndex: 9995,
        p: 2,
        gap: 1,
        borderBottom: '1px solid',
        borderColor: 'background.level1',
        boxShadow: 'sm',
      }}
    >
      <GlobalStyles
        styles={(theme) => ({
          ':root': {
            '--Header-height': '52px',
            [theme.breakpoints.up('md')]: {
              '--Header-height': '0px',
            },
          },
        })}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
         <Typography level="title-lg">
          <img
            src="/src/assets/Logo-Dai-hoc-Dong-Thap.png"
            alt="Logo"
            className="h-8 w-auto object-contain" 
          />
        </Typography>
      </Box>
      <IconButton
        onClick={() => toggleSidebar()}
        variant="outlined"
        color="neutral"
        size="sm"
      >
        <MenuRoundedIcon />
      </IconButton>
    </Sheet>
  );
}

