import DescriptionIcon from "@mui/icons-material/Description";
import FavoriteIcon from "@mui/icons-material/Favorite";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import WorkIcon from "@mui/icons-material/Work";
import FolderIcon from "@mui/icons-material/Folder";
import PersonIcon from "@mui/icons-material/Person";
import ArticleIcon from "@mui/icons-material/Article";
/* import CloudUploadIcon from '@mui/icons-material/CloudUpload'; */

export const navItems = [
  {
    key: "cv",
    label: "Lebenslauf",
    href: "#cv",
    icon: DescriptionIcon,
    detail: "Kurzprofil und PDF-Download.",
  },
  {
    key: "hobbies",
    label: "Hobbys",
    href: "#hobbies",
    icon: FavoriteIcon,
    detail: "Interessen und Freizeit.",
  },
  {
    key: "certificates",
    label: "Zertifikate",
    href: "#certificates",
    icon: WorkspacePremiumIcon,
    detail: "Nachweise und Links.",
  },
  {
    key: "projects",
    label: "Projekte",
    href: "#projects",
    icon: WorkIcon,
    detail: "Ausgewählte Arbeiten und Demos.",
  },
  {
    key: "repos",
    label: "Repositories",
    href: "#repos",
    icon: FolderIcon,
    detail: "Neueste GitHub-Repositories.",
  },
  {
    key: "blog",
    label: "Blog",
    href: "/blog",
    icon: ArticleIcon,
    detail: "Wissen, Tutorials und Lernnotizen.",
  },
  {
    key: "developer",
    label: "Anwendungsentwickler",
    href: "#developer",
    icon: PersonIcon,
    detail: "Profil und Skills.",
  }/*  ,
  
  {
    key: "foto-uploader",
    label: "Foto Uploader",
    href: "#foto-uploader",
    icon: CloudUploadIcon,
    detail: "Profil und Skills.",
  }, */
];
