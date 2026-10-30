// Arahkan import "./firebase.js" ke stub supaya modul bisa diuji di Node.
import { register } from "node:module";

register(new URL("./loader.js", import.meta.url));
