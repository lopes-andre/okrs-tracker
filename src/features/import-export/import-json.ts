// ============================================================================
// JSON IMPORT - Import plan data from JSON format
// ============================================================================

import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type {
  PlanExport,
  ImportOptions,
  ImportResult,
  ImportPreview,
} from "./types";
import { validateImportFile, countExportEntities } from "./schema";

// ============================================================================
// PREVIEW FUNCTION
// ============================================================================

export function parseImportFile(fileContent: string): ImportPreview {
  try {
    const data = JSON.parse(fileContent);
    const validation = validateImportFile(data);

    if (!validation.success) {
      return {
        plan: { name: "Unknown", year: 0, description: null },
        counts: {
          tags: 0,
          krGroups: 0,
          objectives: 0,
          annualKrs: 0,
          quarterTargets: 0,
          tasks: 0,
          checkIns: 0,
          weeklyReviews: 0,
        },
        validation: {
          isValid: false,
          errors: validation.errors,
          warnings: validation.warnings,
        },
      };
    }

    const counts = countExportEntities(validation.data!);

    return {
      plan: validation.data!.plan,
      counts,
      validation: {
        isValid: true,
        errors: [],
        warnings: validation.warnings,
      },
    };
  } catch (e) {
    return {
      plan: { name: "Unknown", year: 0, description: null },
      counts: {
        tags: 0,
        krGroups: 0,
        objectives: 0,
        annualKrs: 0,
        quarterTargets: 0,
        tasks: 0,
        checkIns: 0,
        weeklyReviews: 0,
      },
      validation: {
        isValid: false,
        errors: [`Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`],
        warnings: [],
      },
    };
  }
}

// ============================================================================
// IMPORT FUNCTION
// ============================================================================

export async function importPlanFromJson(
  fileContent: string,
  options: ImportOptions
): Promise<ImportResult> {
  const supabase = createClient();
  const errors: string[] = [];

  // Parse and validate
  const data = JSON.parse(fileContent) as PlanExport;
  const validation = validateImportFile(data);

  if (!validation.success) {
    return {
      success: false,
      planId: "",
      counts: {
        tags: 0,
        krGroups: 0,
        objectives: 0,
        annualKrs: 0,
        quarterTargets: 0,
        tasks: 0,
        checkIns: 0,
        weeklyReviews: 0,
      },
      errors: validation.errors,
    };
  }

  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      success: false,
      planId: "",
      counts: {
        tags: 0,
        krGroups: 0,
        objectives: 0,
        annualKrs: 0,
        quarterTargets: 0,
        tasks: 0,
        checkIns: 0,
        weeklyReviews: 0,
      },
      errors: ["Authentication required"],
    };
  }

  const userId = userData.user.id;

  // ID mapping from export IDs to real database IDs
  const tagIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();
  const objectiveIdMap = new Map<string, string>();
  const krIdMap = new Map<string, string>();
  const qtIdMap = new Map<string, string>();

  let planId: string;
  const counts = {
    tags: 0,
    krGroups: 0,
    objectives: 0,
    annualKrs: 0,
    quarterTargets: 0,
    tasks: 0,
    checkIns: 0,
    weeklyReviews: 0,
  };

  try {
    // =========================================================================
    // STEP 1: Create or use existing plan
    // =========================================================================
    if (options.createNewPlan) {
      const { data: newPlan, error: planError } = await supabase
        .from("plans")
        .insert({
          name: data.plan.name,
          year: data.plan.year,
          description: data.plan.description,
          created_by: userId,
        })
        .select()
        .single();

      if (planError || !newPlan) {
        throw new Error(`Failed to create plan: ${planError?.message}`);
      }

      planId = newPlan.id;

      // Create membership for the owner
      const { error: memberError } = await supabase
        .from("plan_members")
        .insert({
          plan_id: planId,
          user_id: userId,
          role: "owner",
        });

      if (memberError) {
        throw new Error(`Failed to create membership: ${memberError.message}`);
      }
    } else {
      if (!options.targetPlanId) {
        throw new Error("Target plan ID required for merge import");
      }
      planId = options.targetPlanId;
    }

    // =========================================================================
    // STEP 2: Import Tags
    // =========================================================================
    if (data.tags.length > 0) {
      const tagInserts = data.tags.map((tag) => ({
        plan_id: planId,
        name: tag.name,
        kind: tag.kind,
        color: tag.color,
      }));

      const { data: insertedTags, error: tagError } = await supabase
        .from("tags")
        .insert(tagInserts)
        .select();

      if (tagError) {
        errors.push(`Failed to import some tags: ${tagError.message}`);
      } else if (insertedTags) {
        for (let i = 0; i < data.tags.length; i++) {
          if (insertedTags[i]) {
            tagIdMap.set(data.tags[i]._exportId, insertedTags[i].id);
            counts.tags++;
          }
        }
      }
    }

    // =========================================================================
    // STEP 3: Import KR Groups
    // =========================================================================
    if (data.krGroups.length > 0) {
      const groupInserts = data.krGroups.map((group) => ({
        plan_id: planId,
        name: group.name,
        description: group.description,
        color: group.color,
        sort_order: group.sortOrder,
      }));

      const { data: insertedGroups, error: groupError } = await supabase
        .from("kr_groups")
        .insert(groupInserts)
        .select();

      if (groupError) {
        errors.push(`Failed to import some KR groups: ${groupError.message}`);
      } else if (insertedGroups) {
        for (let i = 0; i < data.krGroups.length; i++) {
          if (insertedGroups[i]) {
            groupIdMap.set(data.krGroups[i]._exportId, insertedGroups[i].id);
            counts.krGroups++;
          }
        }
      }
    }

    // =========================================================================
    // STEP 4: Import Objectives with nested KRs and Quarter Targets
    // =========================================================================
    for (const objective of data.objectives) {
      // Insert objective
      const { data: insertedObj, error: objError } = await supabase
        .from("objectives")
        .insert({
          plan_id: planId,
          code: objective.code,
          name: objective.name,
          description: objective.description,
          sort_order: objective.sortOrder,
        })
        .select()
        .single();

      if (objError || !insertedObj) {
        errors.push(`Failed to import objective "${objective.name}": ${objError?.message}`);
        continue;
      }

      objectiveIdMap.set(objective._exportId, insertedObj.id);
      counts.objectives++;

      // Insert Annual KRs for this objective
      for (const kr of objective.annualKrs) {
        const currentValue = options.resetProgress ? kr.startValue : kr.currentValue;
        const groupId = kr.groupRef ? groupIdMap.get(kr.groupRef) : null;

        const { data: insertedKr, error: krError } = await supabase
          .from("annual_krs")
          .insert({
            objective_id: insertedObj.id,
            group_id: groupId || null,
            name: kr.name,
            description: kr.description,
            kr_type: kr.krType,
            direction: kr.direction,
            aggregation: kr.aggregation,
            unit: kr.unit,
            start_value: kr.startValue,
            target_value: kr.targetValue,
            current_value: currentValue,
            sort_order: kr.sortOrder,
          })
          .select()
          .single();

        if (krError || !insertedKr) {
          errors.push(`Failed to import KR "${kr.name}": ${krError?.message}`);
          continue;
        }

        krIdMap.set(kr._exportId, insertedKr.id);
        counts.annualKrs++;

        // Insert Quarter Targets for this KR
        for (const qt of kr.quarterTargets) {
          const qtCurrentValue = options.resetProgress ? 0 : qt.currentValue;

          const { data: insertedQt, error: qtError } = await supabase
            .from("quarter_targets")
            .insert({
              annual_kr_id: insertedKr.id,
              quarter: qt.quarter,
              target_value: qt.targetValue,
              current_value: qtCurrentValue,
              notes: qt.notes,
            })
            .select()
            .single();

          if (qtError || !insertedQt) {
            errors.push(`Failed to import quarter target for Q${qt.quarter}: ${qtError?.message}`);
            continue;
          }

          qtIdMap.set(qt._exportId, insertedQt.id);
          counts.quarterTargets++;
        }
      }
    }

    // =========================================================================
    // STEP 5: Import Tasks
    // =========================================================================
    for (const task of data.tasks) {
      const objectiveId = task.objectiveRef
        ? objectiveIdMap.get(task.objectiveRef)
        : null;
      const krId = task.annualKrRef ? krIdMap.get(task.annualKrRef) : null;
      const qtId = task.quarterTargetRef
        ? qtIdMap.get(task.quarterTargetRef)
        : null;

      const { data: insertedTask, error: taskError } = await supabase
        .from("tasks")
        .insert({
          plan_id: planId,
          objective_id: objectiveId || null,
          annual_kr_id: krId || null,
          quarter_target_id: qtId || null,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          effort: task.effort,
          due_date: task.dueDate,
          due_time: task.dueTime,
          completed_at: task.completedAt,
          sort_order: task.sortOrder,
        })
        .select()
        .single();

      if (taskError || !insertedTask) {
        errors.push(`Failed to import task "${task.title}": ${taskError?.message}`);
        continue;
      }

      counts.tasks++;

      // Insert task tags
      const tagIds = task.tagRefs
        .map((ref) => tagIdMap.get(ref))
        .filter((id): id is string => id !== undefined);

      if (tagIds.length > 0) {
        const taskTagInserts = tagIds.map((tagId) => ({
          task_id: insertedTask.id,
          tag_id: tagId,
        }));

        await supabase.from("task_tags").insert(taskTagInserts);
      }
    }

    // =========================================================================
    // STEP 6: Import Check-ins (if not skipped)
    // =========================================================================
    if (!options.skipCheckIns && data.checkIns.length > 0) {
      for (const checkIn of data.checkIns) {
        const krId = krIdMap.get(checkIn.annualKrRef);
        if (!krId) {
          continue; // Skip if KR not found
        }

        const qtId = checkIn.quarterTargetRef
          ? qtIdMap.get(checkIn.quarterTargetRef)
          : null;

        const { error: checkInError } = await supabase.from("check_ins").insert({
          annual_kr_id: krId,
          quarter_target_id: qtId || null,
          value: checkIn.value,
          previous_value: checkIn.previousValue,
          note: checkIn.note,
          evidence_url: checkIn.evidenceUrl || null,
          recorded_at: checkIn.recordedAt,
          recorded_by: userId,
        });

        if (checkInError) {
          errors.push(`Failed to import check-in: ${checkInError.message}`);
          continue;
        }

        counts.checkIns++;
      }
    }

    // =========================================================================
    // STEP 7: Import Weekly Reviews (if not skipped)
    // =========================================================================
    if (!options.skipWeeklyReviews && data.weeklyReviews.length > 0) {
      for (const review of data.weeklyReviews) {
        const { error: reviewError } = await supabase
          .from("weekly_reviews")
          .insert({
            plan_id: planId,
            year: review.year,
            week_number: review.weekNumber,
            week_start: review.weekStart,
            week_end: review.weekEnd,
            status: review.status,
            started_at: review.startedAt,
            completed_at: review.completedAt,
            reflection_what_went_well: review.reflectionWhatWentWell,
            reflection_what_to_improve: review.reflectionWhatToImprove,
            reflection_lessons_learned: review.reflectionLessonsLearned,
            reflection_notes: review.reflectionNotes,
            stats_krs_updated: review.statsKrsUpdated,
            stats_tasks_completed: review.statsTasksCompleted,
            stats_tasks_created: review.statsTasksCreated,
            stats_check_ins_made: review.statsCheckInsMade,
            stats_objectives_on_track: review.statsObjectivesOnTrack,
            stats_objectives_at_risk: review.statsObjectivesAtRisk,
            stats_objectives_off_track: review.statsObjectivesOffTrack,
            stats_overall_progress: review.statsOverallProgress,
            stats_total_krs: review.statsTotalKrs,
            week_rating: review.weekRating,
          });

        if (reviewError) {
          // Skip duplicates (same week/year)
          if (reviewError.code !== "23505") {
            errors.push(`Failed to import weekly review for week ${review.weekNumber}: ${reviewError.message}`);
          }
          continue;
        }

        counts.weeklyReviews++;
      }
    }

    return {
      success: errors.length === 0,
      planId,
      counts,
      errors,
    };
  } catch (e) {
    return {
      success: false,
      planId: planId!,
      counts,
      errors: [
        ...errors,
        e instanceof Error ? e.message : "Unknown error during import",
      ],
    };
  }
}
