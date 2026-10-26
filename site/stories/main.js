import { mountHeader } from "/shared/lab.js";
import { mountStories } from "./stories.js";

mountHeader(document.getElementById("hdr"), "stories");
mountStories(document.getElementById("stories"));
