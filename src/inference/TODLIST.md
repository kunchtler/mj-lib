QUICKLY : Vérifier que pour la table, tout se gère bien dans le simu (avec spots).

Avoir tout un flot du programme : quelles fonctions sont fait avant lesquelles, quelles transformations, etc

Pour l'instant, version simple sans le put / take.

Faire dans les utils des grouped exports, surtout à propos des types !
export \* as ... from ...;

Documenter qlq part qu'on indique toutes les balles présentes sur la table au début, et que le jongleur commence balles sur table. Sauf s'il n'y a pas de table.

Ajouter "tempo" au JugglerState? Ca fait sens, vu qu'on a le tempo dans les événements à la fin.

All interfaces to types ?

Rajouter la possibilité d'échanger des balles de mains lors des transitions.

Fixer les problèmes quand on spécifie où prendre plusieurs balles Ré de la même main en même temps.

Rajouter la structure des mains.

Rajouter la présence ou l'absence de table.

Rajouter la périodicité ?

Remove generateInitialState and just autogenerate it ?

Rename setupHands to handsSetup.

TODOs from files :
//TODO : FOr the packages in pnpm, if they have modular install, use it !


GITHUB ISSUES for roadmap / milestones
- hand ball subpositions
- better hand movement
- allow balls to be put on any table spots, and for table spots to have no default accepted ball type.
- add support for custom meshes
- add support for custom sounds
- more detailed hand movements over table and their order ?
- hand topology (custom functions, how does it behave when a ball goes out)
- swing rhythm (analog to music : how can we whange the base rhythm ? Mention it should be researched.)

- npq mention in README https://github.com/lirantal/npq