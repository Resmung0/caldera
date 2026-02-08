import {
  SiLangchain,
  SiDvc,
  SiGithub,
  SiGitlab,
  SiJenkins,
  SiApacheairflow,
  SiPrefect,
  SiCircleci,
  SiTravisci,
  SiKedro,
  SiUipath,
} from 'react-icons/si';
import type { IconType } from 'react-icons';

const iconMap: Record<string, IconType> = {
  langchain: SiLangchain,
  dvc: SiDvc,
  githubaction: SiGithub,
  githubactions: SiGithub,
  gitlabci: SiGitlab,
  jenkins: SiJenkins,
  airflow: SiApacheairflow,
  apacheairflow: SiApacheairflow,
  prefect: SiPrefect,
  circleci: SiCircleci,
  travis: SiTravisci,
  travisci: SiTravisci,
  kedro: SiKedro,
  uipath: SiUipath,
};

export const getToolIcon = (toolName: string): IconType | null => {
  const normalized = toolName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return iconMap[normalized] || null;
};
