import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { subCategories } from "../constants/constants";
import { apiBaseUrl, uploadBaseUrl } from "@/constants/api";

type Props = {
  accessToken: string;
  tokenExpiresAt: number | null;
  onSessionExpired: () => void;
};

const UploadForm: React.FC<Props> = ({
  accessToken,
  tokenExpiresAt,
  onSessionExpired,
}) => {
  const [category, setCategory] = useState<"foto" | "garten" | "certificates">(
    "foto"
  );
  const [subCategory, setSubCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const isCertificate = category === "certificates";

  useEffect(() => {
    if (category === "certificates") {
      setSubCategory("all");
    } else if (subCategory === "all") {
      setSubCategory("");
    }
  }, [category, subCategory]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    const baseName = nextFile.name.replace(/\.[^/.]+$/, "");
    setName(baseName);
  };

  const handleSubmit = async () => {
    const normalizedSubCategory = isCertificate ? "all" : subCategory;

    if (!file || !title || (!isCertificate && !normalizedSubCategory)) {
      alert(
        isCertificate
          ? "Bitte wählen Sie eine Datei und geben Sie den Zertifikatnamen ein"
          : "Bitte wählen Sie eine Datei, einen Titel und eine Unterkategorie",
      );
      return;
    }

    if (
      !accessToken ||
      !tokenExpiresAt ||
      tokenExpiresAt - Date.now() <= 10_000
    ) {
      onSessionExpired();
      alert("Sitzung abgelaufen. Bitte melden Sie sich erneut an.");
      return;
    }

    if (!uploadBaseUrl || !apiBaseUrl) {
      alert("Upload-API nicht konfiguriert.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("sub_category", normalizedSubCategory);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("image", file);

      const { data } = await axios.post(`${uploadBaseUrl}/upload`, formData, {
        timeout: 30_000,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const savedFileName: string =
        data?.file?.filename ??
        (() => {
          const match = file.name.match(/\.[^.]+$/);
          const ext = match ? match[0] : "";
          return `${name}${ext}`;
        })();

      const srcFromServer: string | undefined = data?.src;
      const assetSrc =
        srcFromServer ??
        `/${isCertificate ? "certificates" : category}/${savedFileName}`;
      const payload = isCertificate
        ? {
            name: title,
            issuer: description,
            img: assetSrc,
          }
        : {
            src: assetSrc,
            name,
            title,
            description,
            category,
            sub_category: normalizedSubCategory,
          };

      const endpoint = isCertificate
        ? `${apiBaseUrl}/certificates`
        : category === "foto"
          ? `${apiBaseUrl}/fotografiePhotos`
          : `${apiBaseUrl}/gardenPhotos`;
      const eventName = isCertificate ? "certificates:updated" : "photos:updated";
      const itemLabel = isCertificate ? "Zertifikat" : "Foto";

      let dbSaved = true;

      try {
        await axios.post(endpoint, payload, {
          timeout: 10_000,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (dbError) {
        dbSaved = false;
        if (axios.isAxiosError(dbError) && dbError.response?.status === 401) {
          onSessionExpired();
          alert(
            "Sitzung abgelaufen oder Autorisierung ungültig. Bitte melden Sie sich erneut an.",
          );
          return;
        }

        if (axios.isAxiosError(dbError)) {
          console.warn("Datenspeicherung fehlgeschlagen:", dbError.message);
          alert(
            `${itemLabel} hochgeladen, aber Liste konnte nicht aktualisiert werden: ${dbError.message}`,
          );
        } else {
          console.warn("Datenspeicherung fehlgeschlagen:", dbError);
          alert(
            `${itemLabel} hochgeladen, aber Liste konnte nicht aktualisiert werden.`,
          );
        }
      }

      if (dbSaved) {
        try {
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: { category, subCategory: normalizedSubCategory },
            })
          );
        } catch {
          // Intentionally left empty
        }

        alert(`✓ ${itemLabel} gespeichert!`);
      }

      setFile(null);
      setName("");
      setTitle("");
      setDescription("");
      setSubCategory("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          onSessionExpired();
          alert(
            "Sitzung abgelaufen oder Autorisierung ungültig. Bitte melden Sie sich erneut an.",
          );
          return;
        }
        console.error("Axios-Fehler:", error.message);
        alert(`Ein Fehler ist aufgetreten: ${error.message}`);
      } else {
        console.error("Unbekannter Fehler:", error);
        alert(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      className="admin-form-card"
      sx={{
        p: 3,
        color: "#fff",
        mx: "auto",
      }}>
      <Typography
        variant="h6"
        mb={1}
        sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
        {isCertificate
          ? "Neues Zertifikat hinzufügen"
          : "Neues Foto hinzufügen"}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "rgba(226, 232, 240, 0.82)", mb: 2 }}>
        Mit aktivem JWT angemeldet. Bei Ablauf der Sitzung werden Sie zum
        Login-Bildschirm weitergeleitet.
      </Typography>

      <Stack
        spacing={2}
        sx={{
          "& .MuiInputBase-root": {
            color: "#fff",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            borderRadius: 2,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.25)",
          },
          "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.45)",
          },
          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
            {
              borderColor: "#38bdf8",
            },
          "& .MuiInputLabel-root": {
            color: "rgba(255, 255, 255, 0.75)",
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "#e2e8f0",
          },
          "& .MuiSelect-icon": {
            color: "#fff",
          },
          "& .MuiFormHelperText-root": {
            color: "rgba(226, 232, 240, 0.75)",
            marginLeft: "4px",
          },
        }}>
        <Select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as "foto" | "garten" | "certificates")
          }
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: "#0b1120",
                color: "#fff",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              },
            },
          }}>
          <MenuItem value="foto">foto</MenuItem>
          <MenuItem value="garten">garten</MenuItem>
          <MenuItem value="certificates">certificates</MenuItem>
        </Select>

        <Select
          value={subCategory}
          onChange={(e) => setSubCategory(e.target.value)}
          displayEmpty
          disabled={isCertificate}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: "#0b1120",
                color: "#fff",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              },
            },
          }}>
          <MenuItem value="" disabled>
            Unterkategorie wählen
          </MenuItem>
          {subCategories[category].map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>

        <TextField
          type="file"
          inputProps={{ accept: "image/jpeg,image/png,image/webp" }}
          onChange={handleFile}
        />

        <TextField
          label="Dateiname"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label={isCertificate ? "Zertifikatnname" : "Titel"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <TextField
          label={isCertificate ? "Institution / Aussteller" : "Beschreibung"}
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !file}
          sx={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
            color: "#fff",
            fontWeight: 600,
            textTransform: "none",
            boxShadow: "0 12px 24px rgba(2, 6, 23, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #1e40af 0%, #0284c7 100%)",
            },
          }}>
          Speichern
        </Button>
      </Stack>
    </Box>
  );
};

export { UploadForm };
