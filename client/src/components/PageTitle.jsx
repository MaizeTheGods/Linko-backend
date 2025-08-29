import { useLocation } from 'react-router-dom';

const PageTitle = ({ customTitle }) => {
  const location = useLocation();
  
  if (customTitle) return <h2 style={{ margin: '6px 0 10px' }}>{customTitle}</h2>;
  
  let title = location.pathname;
  if (title === '/') title = 'Inicio';
  else if (title.startsWith('/perfil/')) {
    const username = title.split('/')[2];
    title = `Perfil de @${username}`;
  } else {
    title = title.charAt(1).toUpperCase() + title.slice(2);
  }
  
  return <h2 style={{ margin: '6px 0 10px' }}>{title}</h2>;
};

export default PageTitle;
