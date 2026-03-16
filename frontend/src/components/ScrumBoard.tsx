import { KanbanBoard } from "./kibo-ui/kanban";

export const ScrumBoard = ({ issues, columns, onColumnChange, onAssignToSprint }) => {
  return (
    <KanbanBoard
      items={issues}
      columns={columns}
      onColumnChange={onColumnChange}
      onAssignToSprint={onAssignToSprint}
    />
  );
};
