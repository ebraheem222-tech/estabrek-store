export interface NavTemplate {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  styles: {
    nav: string;
    container: string;
    logo: string;
    links: string;
    link: string;
    linkHover: string;
    linkActive: string;
    button?: string;
    mobileMenu?: string;
    mobileToggle?: string;
  };
}

